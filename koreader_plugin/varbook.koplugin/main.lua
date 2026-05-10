--[[
    Varbook KOReader Plugin
    Synchronizes reading progress with a Varbook (BookShelf) server.

    - Tracks page turns locally in SQLite (percentage + timestamp)
    - Manual sync via menu button: pull server position, push local positions
    - Uses pivot format (spine_index + spine_percent) for cross-device compatibility
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
-- Pivot: cross-client position format
-- ==========================================

--- Extract the 0-based DocFragment index from an XPointer.
-- CREngine's DocFragment[N] is 1-based; this returns N-1 (0-based).
-- NOTE: This is NOT the OPF spine index — use getSpineMapping() to convert.
-- @param xpointer string XPointer string
-- @return number 0-based DocFragment index
local function fragIndexFromXPointer(xpointer)
    local n = xpointer:match("DocFragment%[(%d+)%]")
    if n then
        return tonumber(n) - 1
    end
    -- No DocFragment = mono-file EPUB
    return 0
end

--- Read the OPF content from the EPUB archive via CREngine.
-- @return string|nil OPF XML content
function Varbook:readOpfContent()
    if not self.ui.document.getDocumentFileContent then
        logger.warn("Varbook: getDocumentFileContent not available")
        return nil
    end

    local ok_c, container = pcall(
        self.ui.document.getDocumentFileContent,
        self.ui.document, "META-INF/container.xml")
    if not ok_c or not container then
        logger.warn("Varbook: could not read META-INF/container.xml")
        return nil
    end

    local opf_path = container:match('full%-path="([^"]+)"')
    if not opf_path then
        logger.warn("Varbook: OPF path not found in container.xml")
        return nil
    end

    local ok_o, opf = pcall(
        self.ui.document.getDocumentFileContent,
        self.ui.document, opf_path)
    if not ok_o or not opf then
        logger.warn("Varbook: could not read OPF at", opf_path)
        return nil
    end

    return opf
end

--- Parse the OPF XML to extract spine hrefs in order.
-- @param opf string OPF XML content
-- @return table Array of href strings in OPF spine order
local function parseSpineFromOpf(opf)
    -- Build manifest lookup: id → href
    local manifest = {}
    for tag in opf:gmatch("<item[^>]+>") do
        local id = tag:match('id="([^"]*)"')
        local href = tag:match('href="([^"]*)"')
        if id and href then
            manifest[id] = href
        end
    end

    -- Extract spine itemrefs in order, resolve to hrefs
    local hrefs = {}
    for tag in opf:gmatch("<itemref[^>]+>") do
        local idref = tag:match('idref="([^"]*)"')
        if idref and manifest[idref] then
            table.insert(hrefs, manifest[idref])
        end
    end

    return hrefs
end

--- Build the mapping between OPF spine indices and CREngine DocFragment numbers.
-- Reads the OPF from the EPUB, counts DocFragments, and computes the correspondence.
-- CREngine may have more or fewer DocFragments than OPF spine items (e.g., older
-- versions skip non-XHTML items, or extra items from <guide> are included).
-- Result is cached per document.
-- @return table {frag_for_spine, spine_for_frag, spine_hrefs, offset, total_frags, spine_count}
function Varbook:getSpineMapping()
    local doc_hash = self:getDocHash()
    if self._spine_map_hash == doc_hash and self._spine_map then
        return self._spine_map
    end

    local result = {
        frag_for_spine = {}, -- OPF spine index (0-based) → DocFragment N (1-based)
        spine_for_frag = {}, -- DocFragment N (1-based) → OPF spine index (0-based)
        spine_hrefs = {},    -- OPF spine index (0-based) → href string
        offset = 0,          -- total_frags - spine_count
        total_frags = 0,
        spine_count = 0,
    }

    -- Count DocFragments by probing
    for i = 1, 5000 do
        if self.ui.document:isXPointerInDocument(
                "/body/DocFragment[" .. i .. "]/body") then
            result.total_frags = i
        else
            break
        end
    end

    -- Read and parse OPF spine
    local opf = self:readOpfContent()
    local spine_hrefs = opf and parseSpineFromOpf(opf) or {}
    result.spine_count = #spine_hrefs

    for i, href in ipairs(spine_hrefs) do
        result.spine_hrefs[i - 1] = href -- store 0-based
    end

    logger.dbg("Varbook: spine mapping: total_frags=", result.total_frags,
        "spine_count=", result.spine_count)

    if result.spine_count == 0 then
        -- No OPF data: assume 1:1 mapping (DocFragment[N] = spine N-1)
        logger.warn("Varbook: no OPF spine data, assuming 1:1 mapping")
        for i = 1, result.total_frags do
            result.frag_for_spine[i - 1] = i
            result.spine_for_frag[i] = i - 1
        end
    elseif result.total_frags == result.spine_count then
        -- Counts match: 1:1 mapping, no offset
        result.offset = 0
        for i = 0, result.spine_count - 1 do
            result.frag_for_spine[i] = i + 1
            result.spine_for_frag[i + 1] = i
        end
    else
        -- Counts differ: compute offset (extra DocFragments assumed at beginning)
        result.offset = result.total_frags - result.spine_count
        logger.warn("Varbook: DocFragment/spine count mismatch!",
            "frags=", result.total_frags, "spine=", result.spine_count,
            "offset=", result.offset)
        if result.offset > 0 then
            -- More DocFragments than spine items: extras at the beginning
            for i = 0, result.spine_count - 1 do
                local frag_n = i + 1 + result.offset
                result.frag_for_spine[i] = frag_n
                result.spine_for_frag[frag_n] = i
            end
        else
            -- Fewer DocFragments: CREngine skipped some spine items
            -- Map sequentially (DocFragment order matches spine order, gaps skipped)
            local frag_idx = 1
            for i = 0, result.spine_count - 1 do
                if frag_idx <= result.total_frags then
                    result.frag_for_spine[i] = frag_idx
                    result.spine_for_frag[frag_idx] = i
                    frag_idx = frag_idx + 1
                end
            end
        end
    end

    -- Log a few mappings for debugging
    local log_count = math.min(5, result.spine_count)
    for i = 0, log_count - 1 do
        logger.dbg("Varbook:   spine[" .. i .. "] ("
            .. (result.spine_hrefs[i] or "?") .. ") → DocFragment["
            .. (result.frag_for_spine[i] or "?") .. "]")
    end
    -- Also log around the middle for large books
    if result.spine_count > 20 then
        local mid = math.floor(result.spine_count / 2)
        logger.dbg("Varbook:   spine[" .. mid .. "] ("
            .. (result.spine_hrefs[mid] or "?") .. ") → DocFragment["
            .. (result.frag_for_spine[mid] or "?") .. "]")
    end

    self._spine_map = result
    self._spine_map_hash = doc_hash
    return result
end

--- Compute spine_percent: ratio of current position within a DocFragment.
-- Based on pixel positions (rendered layout height).
-- @param xpointer string Current XPointer
-- @param frag_index number 0-based DocFragment index (frag_n = frag_index + 1)
-- @return number Ratio 0-1
function Varbook:computeSpinePercent(xpointer, frag_index)
    local ok_cur, current_pos = pcall(
        self.ui.document.getPosFromXPointer, self.ui.document, xpointer)
    if not ok_cur or not current_pos then return 0 end

    local frag_n = frag_index + 1
    local start_xp = "/body/DocFragment[" .. frag_n .. "]/body"
    local ok_start, start_pos = pcall(
        self.ui.document.getPosFromXPointer, self.ui.document, start_xp)
    if not ok_start or not start_pos then return 0 end

    -- End boundary: next DocFragment or document height
    local end_pos = self.ui.document.info.doc_height
    local next_xp = "/body/DocFragment[" .. (frag_n + 1) .. "]/body"
    if self.ui.document:isXPointerInDocument(next_xp) then
        local ok_next, next_pos = pcall(
            self.ui.document.getPosFromXPointer, self.ui.document, next_xp)
        if ok_next and next_pos then
            end_pos = next_pos
        end
    end

    if end_pos <= start_pos then return 0 end

    local ratio = (current_pos - start_pos) / (end_pos - start_pos)
    return math.max(0, math.min(1, ratio))
end

--- Extract a pivot from the current reading position.
-- Converts CREngine DocFragment index to OPF spine_index using the spine mapping.
-- @return table|nil Pivot data {spine_index, spine_href, spine_percent, source}
function Varbook:extractPivot()
    if self.ui.document.info.has_pages then return nil end

    local xpointer = self:getXPointer()
    if not xpointer then return nil end

    local frag_index = fragIndexFromXPointer(xpointer)
    local spine_percent = self:computeSpinePercent(xpointer, frag_index)

    -- Convert DocFragment index to OPF spine_index via mapping
    local mapping = self:getSpineMapping()
    local frag_n = frag_index + 1
    local spine_index = mapping.spine_for_frag[frag_n]

    if spine_index == nil then
        -- Fallback: assume 1:1 if mapping is missing for this fragment
        logger.warn("Varbook: no spine mapping for DocFragment[" .. frag_n .. "]",
            "falling back to frag_index")
        spine_index = frag_index
    end

    local spine_href = mapping.spine_hrefs[spine_index] or ""

    logger.dbg("Varbook: extractPivot DocFragment[" .. frag_n .. "]",
        "→ spine_index=", spine_index,
        "(offset=", mapping.offset, ")",
        "spine_percent=", string.format("%.4f", spine_percent),
        "spine_href=", spine_href)

    return {
        spine_index = spine_index,
        spine_href = spine_href,
        spine_percent = math.floor(spine_percent * 10000) / 10000,
        source = "koreader",
    }
end

--- Navigate to a pivot position.
-- Converts OPF spine_index to CREngine DocFragment number using the spine mapping,
-- then applies spine_percent within the fragment boundaries.
-- @param pivot table {spine_index, spine_href, spine_percent}
-- @return boolean True if navigation succeeded
function Varbook:resolvePivot(pivot)
    if self.ui.document.info.has_pages then return false end

    local mapping = self:getSpineMapping()

    -- Resolve spine_index → DocFragment number via mapping
    local frag_n = mapping.frag_for_spine[pivot.spine_index]

    -- Validate with spine_href if available
    if frag_n and pivot.spine_href and pivot.spine_href ~= "" then
        local expected_href = mapping.spine_hrefs[pivot.spine_index]
        if expected_href and expected_href ~= pivot.spine_href then
            logger.warn("Varbook: spine_index/href mismatch!",
                "spine_index=", pivot.spine_index,
                "expected_href=", expected_href,
                "pivot_href=", pivot.spine_href)
            -- Search for the correct spine_index by href
            frag_n = nil -- force fallback below
        end
    end

    -- Fallback: search by spine_href in the mapping
    if not frag_n and pivot.spine_href and pivot.spine_href ~= "" then
        logger.dbg("Varbook: searching for spine_href", pivot.spine_href)
        for si, href in pairs(mapping.spine_hrefs) do
            if href == pivot.spine_href then
                frag_n = mapping.frag_for_spine[si]
                logger.dbg("Varbook: found spine_href at spine_index=", si,
                    "→ DocFragment[" .. (frag_n or "nil") .. "]")
                break
            end
        end
    end

    -- Last resort: assume 1:1 mapping
    if not frag_n then
        frag_n = pivot.spine_index + 1
        logger.warn("Varbook: no mapping found, using spine_index+1 =",
            frag_n, "as DocFragment")
    end

    -- Verify DocFragment exists
    local start_xp = "/body/DocFragment[" .. frag_n .. "]/body"
    if not self.ui.document:isXPointerInDocument(start_xp) then
        logger.warn("Varbook: DocFragment[" .. frag_n .. "] not in document")
        return false
    end

    -- Get DocFragment boundaries
    local ok_start, start_pos = pcall(
        self.ui.document.getPosFromXPointer, self.ui.document, start_xp)
    if not ok_start or not start_pos then
        logger.warn("Varbook: resolvePivot getPosFromXPointer failed")
        return false
    end

    local doc_height = self.ui.document.info.doc_height
    local end_pos = doc_height
    local next_xp = "/body/DocFragment[" .. (frag_n + 1) .. "]/body"
    if self.ui.document:isXPointerInDocument(next_xp) then
        local ok_next, next_pos = pcall(
            self.ui.document.getPosFromXPointer, self.ui.document, next_xp)
        if ok_next and next_pos then
            end_pos = next_pos
        end
    end

    -- Apply spine_percent within the DocFragment
    local target_pos = start_pos + (end_pos - start_pos) * pivot.spine_percent
    local page_count = self.ui.document:getPageCount()
    local target_page = math.floor(target_pos / doc_height * page_count)
    target_page = math.max(1, math.min(page_count, target_page))

    logger.dbg("Varbook: resolvePivot spine_index=", pivot.spine_index,
        "→ DocFragment[" .. frag_n .. "]",
        "(offset=", mapping.offset, ")",
        "spine_percent=", pivot.spine_percent,
        "target_page=", target_page, "/", page_count)

    local target_xp = self.ui.document:getPageXPointer(target_page)
    self.ui:handleEvent(Event:new("GotoXPointer", target_xp))
    return true
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
        "position=", server and server.position,
        "has_pivot=", server and server.pivot ~= nil)

    if server and server_progress > current + 1 then
        -- Server is ahead: navigate there
        local use_xpointer = server.last_sync_client == "koreader"
            and server.position
            and not self.ui.document.info.has_pages

        local use_pivot = server.last_sync_client ~= "koreader"
            and server.pivot
            and not self.ui.document.info.has_pages

        if use_xpointer then
            -- Same-client sync: use precise XPointer
            logger.dbg("Varbook: navigation: XPOINTER",
                "xpointer=", server.position)
            self.ui:handleEvent(Event:new("GotoXPointer", server.position))
        elseif use_pivot then
            -- Cross-client sync: use pivot (spine_index + spine_percent)
            logger.dbg("Varbook: navigation: PIVOT",
                "spine_index=", server.pivot.spine_index,
                "spine_percent=", server.pivot.spine_percent,
                "source=", server.pivot.source)
            local ok = self:resolvePivot(server.pivot)
            if not ok then
                -- Fallback to percentage
                logger.dbg("Varbook: pivot failed, fallback to PERCENTAGE")
                local page_count = self.ui.document:getPageCount()
                local target_page = math.floor(page_count * server_progress / 100)
                self.ui:handleEvent(Event:new("GotoPage", target_page))
            end
        else
            -- Fallback: percentage-based navigation
            local page_count = self.ui.document:getPageCount()
            local target_page = math.floor(page_count * server_progress / 100)
            local reason
            if server.last_sync_client ~= "koreader" then
                reason = "last_sync_client=" .. tostring(server.last_sync_client) .. " (no pivot)"
            elseif not server.position then
                reason = "no xpointer from server"
            elseif self.ui.document.info.has_pages then
                reason = "paged document"
            end
            logger.dbg("Varbook: navigation: PERCENTAGE",
                "reason:", reason,
                "target_page=", target_page, "/", page_count)
            self.ui:handleEvent(Event:new("GotoPage", target_page))
        end
        navigated = true
    else
        logger.dbg("Varbook: no navigation needed",
            "server_progress=", server_progress, "% local=", current, "%")
    end

    -- Step 3: Handle local unsynced positions
    local positions = VarbookDB:getUnsyncedPositions(doc_hash)

    if navigated then
        -- Server was ahead: discard all local positions
        logger.dbg("Varbook: discarding", #positions, "local positions (server was ahead)")
        VarbookDB:markSynced(doc_hash)
    elseif #positions > 0 then
        -- Local is ahead: push positions + pivot to server
        local with_xpointer = 0
        for _, p in ipairs(positions) do
            if p.xpointer then with_xpointer = with_xpointer + 1 end
        end
        logger.dbg("Varbook: pushing", #positions, "positions",
            "(", with_xpointer, "with xpointer,", #positions - with_xpointer, "without)")

        -- Extract pivot from current position for cross-client sync
        local pivot = self:extractPivot()

        local count, push_err = api:pushBatch(doc_hash, positions, pivot)

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
