--[[
    Varbook KOReader Plugin
    Synchronizes reading progress with a Varbook (BookShelf) server.

    - Tracks page turns locally in SQLite (percentage + timestamp)
    - Manual sync via menu button: pull server position, push local positions
    - Uses percentage-based navigation for cross-device compatibility
]]--

local DataStorage = require("datastorage")
local Event = require("ui/event")
local InfoMessage = require("ui/widget/infomessage")
local InputDialog = require("ui/widget/inputdialog")
local LuaSettings = require("luasettings")
local Math = require("optmath")
local NetworkMgr = require("ui/network/manager")
local Notification = require("ui/widget/notification")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local logger = require("logger")
local Dispatcher = require("dispatcher")
local _ = require("gettext")
local T = require("ffi/util").template

logger.warn("Varbook: loading plugin modules")
local ok1, VarbookAPI = pcall(require, "varbook_api")
if not ok1 then
    logger.warn("Varbook: FAILED to load varbook_api:", VarbookAPI)
    VarbookAPI = nil
end
local ok2, VarbookDB = pcall(require, "varbook_db")
if not ok2 then
    logger.warn("Varbook: FAILED to load varbook_db:", VarbookDB)
    VarbookDB = nil
end
logger.warn("Varbook: modules loaded, api=", ok1, "db=", ok2)

local Varbook = WidgetContainer:extend{
    name = "varbook",
    is_doc_only = true,
}

local SETTINGS_PATH = DataStorage:getSettingsDir() .. "/varbook.lua"

function Varbook:init()
    logger.warn("Varbook: plugin init called")
    self.settings = LuaSettings:open(SETTINGS_PATH)
    self.doc_hash = nil
    self.last_percentage = nil
    self.ui.menu:registerToMainMenu(self)
    self:onDispatcherRegisterActions()
    logger.warn("Varbook: menu registered OK")
end

--- Register Dispatcher action so users can assign "Varbook Sync" to any gesture.
function Varbook:onDispatcherRegisterActions()
    Dispatcher:registerAction("varbook_sync_now", {
        category = "none",
        event = "VarbookSyncNow",
        title = _("Varbook Sync"),
        general = true,
        reader = true,
    })
end

--- Handle the Dispatcher event triggered by gesture/shortcut.
function Varbook:onVarbookSyncNow()
    self:syncNow()
end

--- Get document partial MD5 hash (same hash stored on Varbook server).
function Varbook:getDocHash()
    if self.doc_hash then
        return self.doc_hash
    end
    self.doc_hash = self.ui.doc_settings:readSetting("partial_md5_checksum")
    return self.doc_hash
end

--- Get current reading percentage (0-100).
function Varbook:getPercentage()
    local pct
    if self.ui.document.info.has_pages then
        pct = self.ui.paging:getLastPercent()
    else
        pct = self.ui.rolling:getLastPercent()
    end
    -- getLastPercent() returns 0-1, convert to 0-100
    -- Round to 2 decimal places (0.01% precision) for large books (10,000+ pages)
    return pct and math.floor(pct * 10000) / 100 or nil
end

--- Get current xpointer position (rolling/reflowable documents only).
-- @return string|nil XPointer string, or nil for paged documents
function Varbook:getXPointer()
    if self.ui.document.info.has_pages then
        return nil
    end
    return self.ui.rolling:getLastProgress()
end

--- Get the last sync timestamp for the current document.
function Varbook:getLastSyncTimestamp()
    local doc_hash = self:getDocHash()
    if not doc_hash then return 0 end
    local per_doc = self.settings:readSetting("last_sync", {})
    return per_doc[doc_hash] or 0
end

--- Save the last sync timestamp for the current document.
function Varbook:setLastSyncTimestamp(ts)
    local doc_hash = self:getDocHash()
    if not doc_hash then return end
    local per_doc = self.settings:readSetting("last_sync", {})
    per_doc[doc_hash] = ts
    self.settings:saveSetting("last_sync", per_doc)
    self.settings:flush()
end

function Varbook:isConfigured()
    local url = self.settings:readSetting("server_url")
    local token = self.settings:readSetting("token")
    return url and url ~= "" and token and token ~= ""
end

function Varbook:getAPI()
    return VarbookAPI:new(
        self.settings:readSetting("server_url"),
        self.settings:readSetting("token")
    )
end

-- ==========================================
-- Page turn tracking
-- ==========================================

function Varbook:onPageUpdate()
    if not self:isConfigured() then return end

    local doc_hash = self:getDocHash()
    if not doc_hash then return end

    local percentage = self:getPercentage()
    if percentage == nil then return end

    -- Skip if percentage hasn't changed
    if self.last_percentage and self.last_percentage == percentage then
        return
    end
    self.last_percentage = percentage

    local xpointer = self:getXPointer()
    logger.dbg("Varbook: page update", percentage, "%",
        xpointer and ("xpointer=" .. xpointer) or "no xpointer (paged document)")
    VarbookDB:addPosition(doc_hash, percentage, xpointer)

    -- PIVOT VALIDATION: log spine_percent computation data
    if xpointer and not self.ui.document.info.has_pages then
        self:logPivotValidation(xpointer)
    end
end

--- Temporary validation logging for pivot spine_percent computation.
-- Remove after validation is complete.
function Varbook:logPivotValidation(xpointer)
    -- Extract DocFragment number
    local frag_str = xpointer:match("DocFragment%[(%d+)%]")
    local frag_n = frag_str and tonumber(frag_str) or nil

    if not frag_n then
        logger.warn("Varbook PIVOT-VALIDATION: no DocFragment in xpointer:", xpointer)
        logger.warn("Varbook PIVOT-VALIDATION: (mono-file EPUB, spine_index=0)")
        return
    end

    local spine_index = frag_n - 1

    -- Test getPosFromXPointer on DocFragment boundaries
    local start_xp = "/body/DocFragment[" .. frag_n .. "]/body"
    local ok_start, start_pos = pcall(self.ui.document.getPosFromXPointer,
        self.ui.document, start_xp)
    local ok_cur, current_pos = pcall(self.ui.document.getPosFromXPointer,
        self.ui.document, xpointer)

    -- End boundary: next DocFragment or doc_height
    local end_pos = self.ui.document.info.doc_height
    local end_source = "doc_height"
    local next_xp = "/body/DocFragment[" .. (frag_n + 1) .. "]/body"
    local next_exists = self.ui.document:isXPointerInDocument(next_xp)
    if next_exists then
        local ok_next, next_pos = pcall(self.ui.document.getPosFromXPointer,
            self.ui.document, next_xp)
        if ok_next and next_pos then
            end_pos = next_pos
            end_source = "DocFragment[" .. (frag_n + 1) .. "]"
        end
    end

    -- Compute ratio
    local ratio = -1
    if ok_start and ok_cur and start_pos and current_pos and end_pos
        and end_pos > start_pos then
        ratio = (current_pos - start_pos) / (end_pos - start_pos)
    end

    logger.warn("Varbook PIVOT-VALIDATION:",
        "spine_index=" .. spine_index,
        "frag=" .. frag_n,
        "start_xp_ok=" .. tostring(ok_start),
        "start_pos=" .. tostring(start_pos),
        "current_pos=" .. tostring(ok_cur and current_pos),
        "end_pos=" .. tostring(end_pos) .. " (" .. end_source .. ")",
        "spine_percent=" .. string.format("%.4f", ratio),
        "global_pct=" .. string.format("%.2f", self:getPercentage() or 0) .. "%")
end

function Varbook:onCloseDocument()
    VarbookDB:close()
end

-- ==========================================
-- Sync logic
-- ==========================================

function Varbook:doSync()
    if not self:isConfigured() then
        UIManager:show(InfoMessage:new{
            text = _("Please configure Varbook server URL and token first."),
        })
        return
    end

    local doc_hash = self:getDocHash()
    if not doc_hash then
        UIManager:show(InfoMessage:new{
            text = _("Cannot identify this document."),
        })
        return
    end

    local api = self:getAPI()
    local navigated = false
    local synced_count = 0

    -- Step 1: Pull server progress
    local server, err = api:getProgress(doc_hash)

    if err == "unauthorized" then
        UIManager:show(InfoMessage:new{
            text = _("Authentication failed. Check Varbook settings."),
        })
        return
    elseif err == "network_error" then
        UIManager:show(InfoMessage:new{
            text = _("Network error. Positions saved locally."),
        })
        return
    end

    -- Step 2: Compare server progress with local position
    local current = self:getPercentage() or 0
    local server_progress = server and server.progress or 0
    logger.dbg("Varbook: server=", server_progress, "% local=", current, "%",
        "last_sync_client=", server and server.last_sync_client,
        "position=", server and server.position)

    if server and server_progress > current + 1 then
        -- Server is ahead: another device has read further, navigate there
        local use_xpointer = server.last_sync_client == "koreader"
            and server.position
            and not self.ui.document.info.has_pages

        if use_xpointer then
            logger.dbg("Varbook: navigation decision: XPOINTER",
                "reason: last_sync_client=koreader, xpointer available, rolling document",
                "xpointer=", server.position)
            self.ui:handleEvent(Event:new("GotoXPointer", server.position))
        else
            local page_count = self.ui.document:getPageCount()
            local target_page = math.floor(page_count * server_progress / 100)
            local reason
            if server.last_sync_client ~= "koreader" then
                reason = "last_sync_client=" .. tostring(server.last_sync_client) .. " (not koreader)"
            elseif not server.position then
                reason = "no xpointer from server"
            elseif self.ui.document.info.has_pages then
                reason = "paged document (xpointer not supported)"
            end
            logger.dbg("Varbook: navigation decision: PERCENTAGE",
                "reason:", reason,
                "target_page=", target_page, "/", page_count,
                "(", server_progress, "%)")
            self.ui:handleEvent(Event:new("GotoPage", target_page))
        end
        navigated = true
    else
        logger.dbg("Varbook: no navigation needed",
            "server_progress=", server_progress, "% local=", current, "%",
            server_progress <= current + 1 and "(server not ahead by >1%)" or "")
    end

    -- Step 3: Handle local unsynced positions
    local positions = VarbookDB:getUnsyncedPositions(doc_hash)

    if navigated then
        -- Server was ahead: discard all local positions (they predate the server state)
        logger.dbg("Varbook: discarding", #positions, "local positions (server was ahead)")
        VarbookDB:markSynced(doc_hash)
    elseif #positions > 0 then
        -- Local reading is ahead or equal: push positions to server
        local with_xpointer = 0
        for _, p in ipairs(positions) do
            if p.xpointer then with_xpointer = with_xpointer + 1 end
        end
        logger.dbg("Varbook: pushing", #positions, "positions",
            "(", with_xpointer, "with xpointer,", #positions - with_xpointer, "without)")
        local count, push_err = api:pushBatch(doc_hash, positions)

        if push_err == "unauthorized" then
            UIManager:show(InfoMessage:new{
                text = _("Authentication failed. Check Varbook settings."),
            })
            return
        elseif push_err == "book_not_found" then
            UIManager:show(InfoMessage:new{
                text = _("Book not found on server. Upload it via the web interface first."),
            })
            return
        elseif push_err then
            UIManager:show(InfoMessage:new{
                text = _("Server error. Positions saved locally for next sync."),
            })
            return
        end

        VarbookDB:markSynced(doc_hash)
        synced_count = count or #positions
    end

    -- Step 4: Update last sync timestamp
    self:setLastSyncTimestamp(os.time())

    -- Step 5: Show result
    local msg
    if navigated then
        msg = string.format(_("Synced to %.2f%%."), server.progress)
    elseif synced_count > 0 then
        msg = string.format(_("Pushed %d positions."), synced_count)
    else
        msg = _("Already in sync.")
    end

    UIManager:show(Notification:new{ text = msg })
end

function Varbook:syncNow()
    if NetworkMgr:willRerunWhenOnline(function() self:doSync() end) then
        return
    end
    self:doSync()
end

-- ==========================================
-- Menu
-- ==========================================

function Varbook:addToMainMenu(menu_items)
    menu_items.varbook = {
        text = _("Varbook"),
        sorting_hint = "tools",
        sub_item_table = {
            {
                text = _("Sync now"),
                enabled_func = function()
                    return self:isConfigured()
                end,
                callback = function()
                    self:syncNow()
                end,
                separator = true,
            },
            {
                text = _("Server URL"),
                keep_menu_open = true,
                callback = function(touchmenu_instance)
                    self:showServerURLDialog(touchmenu_instance)
                end,
            },
            {
                text = _("API Token"),
                keep_menu_open = true,
                callback = function(touchmenu_instance)
                    self:showTokenDialog(touchmenu_instance)
                end,
                separator = true,
            },
            {
                text = _("Status"),
                callback = function()
                    self:showStatus()
                end,
            },
        },
    }
end

function Varbook:showServerURLDialog(touchmenu_instance)
    local dialog
    dialog = InputDialog:new{
        title = _("Varbook server URL"),
        input = self.settings:readSetting("server_url") or "https://",
        input_hint = "https://bookshelf.example.com",
        buttons = {{
            {
                text = _("Cancel"),
                id = "close",
                callback = function()
                    UIManager:close(dialog)
                end,
            },
            {
                text = _("Save"),
                is_enter_default = true,
                callback = function()
                    local url = dialog:getInputText()
                    -- Remove trailing slash
                    url = url:gsub("/+$", "")
                    self.settings:saveSetting("server_url", url)
                    self.settings:flush()
                    UIManager:close(dialog)
                    if touchmenu_instance then
                        touchmenu_instance:updateItems()
                    end
                end,
            },
        }},
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

function Varbook:showTokenDialog(touchmenu_instance)
    local current = self.settings:readSetting("token") or ""
    local masked = current ~= "" and (current:sub(1, 4) .. "...") or ""

    local dialog
    dialog = InputDialog:new{
        title = _("API Token"),
        description = masked ~= "" and (
            _("Current token: ") .. masked
        ) or nil,
        input = "",
        input_hint = _("Enter 16-character token"),
        buttons = {{
            {
                text = _("Cancel"),
                id = "close",
                callback = function()
                    UIManager:close(dialog)
                end,
            },
            {
                text = _("Save"),
                is_enter_default = true,
                callback = function()
                    local token = dialog:getInputText()
                    if token and token ~= "" then
                        self.settings:saveSetting("token", token)
                        self.settings:flush()
                    end
                    UIManager:close(dialog)
                    if touchmenu_instance then
                        touchmenu_instance:updateItems()
                    end
                end,
            },
        }},
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

function Varbook:showStatus()
    local doc_hash = self:getDocHash()
    local pending = doc_hash and VarbookDB:countUnsynced(doc_hash) or 0
    local total_pending = VarbookDB:countUnsynced()
    local last_sync = self:getLastSyncTimestamp()
    local last_sync_str = last_sync > 0
        and os.date("%Y-%m-%d %H:%M", last_sync)
        or _("Never")

    local configured = self:isConfigured()
    local url = self.settings:readSetting("server_url") or _("Not set")
    local token = self.settings:readSetting("token")
    local token_str = token and token ~= "" and (token:sub(1, 4) .. "...") or _("Not set")

    local text = table.concat({
        _("Server") .. ": " .. url,
        _("Token") .. ": " .. token_str,
        _("Status") .. ": " .. (configured and _("Configured") or _("Not configured")),
        "",
        _("Current book pending") .. ": " .. tostring(pending),
        _("Total pending") .. ": " .. tostring(total_pending),
        _("Last sync") .. ": " .. last_sync_str,
    }, "\n")

    UIManager:show(InfoMessage:new{ text = text })
end

return Varbook
