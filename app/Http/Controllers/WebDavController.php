<?php

namespace App\Http\Controllers;

use App\Services\WebDav\MoonReaderDirectory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Sabre\DAV\Server;

class WebDavController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = Auth::user();

        // Log incoming request
        Log::channel('webdav')->info('WebDAV Request', [
            'method' => $request->method(),
            'uri' => $request->getRequestUri(),
            'user' => $user->email,
            'content_type' => $request->header('Content-Type'),
            'content_length' => $request->header('Content-Length'),
        ]);

        // Log body for PUT requests (reading position data)
        if ($request->method() === 'PUT') {
            $body = $request->getContent();
            Log::channel('webdav')->debug('WebDAV PUT Body', [
                'uri' => $request->getRequestUri(),
                'body' => substr($body, 0, 1000), // Limit to 1000 chars
            ]);
        }

        // Create the root directory for this user
        $rootDirectory = new MoonReaderDirectory($user);

        // Create the DAV server
        $server = new Server($rootDirectory);

        // Set the base URI
        $server->setBaseUri('/webdav/');

        // Add plugins
        $server->addPlugin(new \Sabre\DAV\Browser\Plugin());
        $server->addPlugin(new \Sabre\DAV\Locks\Plugin(new \Sabre\DAV\Locks\Backend\File(storage_path('app/webdav-locks.dat'))));

        // Disable CSRF for WebDAV
        $response = $server->start();

        // Log response
        Log::channel('webdav')->info('WebDAV Response', [
            'status' => $server->httpResponse->getStatus(),
            'uri' => $request->getRequestUri(),
        ]);

        // Return Laravel response
        return response('', $server->httpResponse->getStatus())
            ->withHeaders($server->httpResponse->getHeaders());
    }
}
