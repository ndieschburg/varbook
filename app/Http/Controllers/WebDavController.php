<?php

namespace App\Http\Controllers;

use App\Services\WebDav\MoonReaderDirectory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Sabre\DAV\Server;

class WebDavController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = Auth::user();

        // Create the root directory for this user
        $rootDirectory = new MoonReaderDirectory($user);

        // Create the DAV server
        $server = new Server($rootDirectory);

        // Set the base URI
        $server->setBaseUri('/webdav/');

        // Add plugins
        $server->addPlugin(new \Sabre\DAV\Browser\Plugin());
        $server->addPlugin(new \Sabre\DAV\Locks\Plugin(new \Sabre\DAV\Locks\Backend\File(storage_path('app/locks'))));

        // Disable CSRF for WebDAV
        $response = $server->start();

        // Return Laravel response
        return response('', $server->httpResponse->getStatus())
            ->withHeaders($server->httpResponse->getHeaders());
    }
}
