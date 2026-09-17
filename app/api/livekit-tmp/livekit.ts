const livekit = require('livekit-client');

const room = new livekit.Room(...);

// call this some time before actually connecting to speed up the actual connection
//room.prepareConnection(url, token);

//await room.connect(...);