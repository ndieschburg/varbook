--[[
    HTTP client wrapper for the Varbook server API.
    Handles GET/POST requests with Bearer token authentication.
]]--

local http = require("socket.http")
local ltn12 = require("ltn12")
local socketutil = require("socketutil")
local JSON = require("json")
local logger = require("logger")

local VarbookAPI = {}

--- Initialize with server URL and token.
-- @param server_url string Base server URL (e.g. "https://bookshelf.hophop.be")
-- @param token string 16-char API token
function VarbookAPI:new(server_url, token)
    local o = {
        server_url = server_url,
        token = token,
    }
    setmetatable(o, { __index = self })
    return o
end

--- Build authorization headers.
-- @return table HTTP headers
function VarbookAPI:headers(content_length)
    local h = {
        ["Accept"] = "application/json",
        ["Authorization"] = "Bearer " .. self.token,
    }
    if content_length then
        h["Content-Type"] = "application/json"
        h["Content-Length"] = tostring(content_length)
    end
    return h
end

--- Fetch server progress for a document.
-- @param doc_hash string KOReader partial MD5 hash
-- @return table|nil {progress, timestamp} or nil on error
-- @return string|nil Error message
function VarbookAPI:getProgress(doc_hash)
    local sink = {}
    local request = {
        url = self.server_url .. "/api/varbook/progress/" .. doc_hash,
        method = "GET",
        headers = self:headers(),
        sink = ltn12.sink.table(sink),
    }

    socketutil:set_timeout(10, 30)
    local code, resp_headers, status = socket.skip(1, http.request(request))
    socketutil:reset_timeout()

    if resp_headers == nil then
        logger.warn("Varbook: network error on getProgress:", status or code)
        return nil, "network_error"
    end

    if code == 404 then
        -- No progress yet for this book
        return nil, nil
    end

    if code ~= 200 then
        logger.warn("Varbook: getProgress HTTP", code)
        return nil, "http_" .. tostring(code)
    end

    local body = table.concat(sink)
    local ok, result = pcall(JSON.decode, body)
    if not ok or not result then
        logger.warn("Varbook: failed to decode getProgress response")
        return nil, "json_error"
    end

    return {
        progress = tonumber(result.progress) or 0,
        timestamp = tonumber(result.timestamp) or 0,
    }, nil
end

--- Push a batch of position updates to the server.
-- @param doc_hash string KOReader partial MD5 hash
-- @param updates table Array of {percentage, timestamp} records
-- @return number|nil Number of synced positions, or nil on error
-- @return string|nil Error message
function VarbookAPI:pushBatch(doc_hash, updates)
    if #updates == 0 then
        return 0, nil
    end

    -- Convert timestamps to ISO8601 for the server
    local formatted = {}
    for _, u in ipairs(updates) do
        table.insert(formatted, {
            progress = u.percentage,
            timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ", u.timestamp),
        })
    end

    local body = JSON.encode({ updates = formatted })
    local sink = {}
    local request = {
        url = self.server_url .. "/api/varbook/progress/" .. doc_hash .. "/batch",
        method = "POST",
        headers = self:headers(#body),
        source = ltn12.source.string(body),
        sink = ltn12.sink.table(sink),
    }

    socketutil:set_timeout(10, 60)
    local code, resp_headers, status = socket.skip(1, http.request(request))
    socketutil:reset_timeout()

    if resp_headers == nil then
        logger.warn("Varbook: network error on pushBatch:", status or code)
        return nil, "network_error"
    end

    if code == 401 then
        return nil, "unauthorized"
    end

    if code == 404 then
        return nil, "book_not_found"
    end

    if code ~= 200 then
        logger.warn("Varbook: pushBatch HTTP", code)
        return nil, "http_" .. tostring(code)
    end

    local resp_body = table.concat(sink)
    local ok, result = pcall(JSON.decode, resp_body)
    if not ok or not result or not result.data then
        logger.warn("Varbook: failed to decode pushBatch response")
        return nil, "json_error"
    end

    return result.data.synced_count or #updates, nil
end

return VarbookAPI
