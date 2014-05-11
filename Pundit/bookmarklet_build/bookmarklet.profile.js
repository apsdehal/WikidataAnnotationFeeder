dependencies = {
    layers: [
        {
            name: "../dijit/dijit.js",
            discard: true,
            dependencies: []
        },
        {
            name: "../dojox/dojox.js",
            discard: true,
            dependencies: []
        },
        {
            name: "Bookmarklet.js",
            resourceName: "dojo.Bookmarklet",
            dependencies: [
                "pundit.Init"
            ]
        }
    ],
    prefixes: [
        ["dojox", "../dojox"],
        ["dijit", "../dijit"],
        ["pundit", "../../src"],
    ]
};