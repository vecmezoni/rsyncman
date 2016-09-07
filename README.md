## How to use

`brew install watchman`

Create config file at ~/.rsyncman.json with something like:
```
{
    "folders": {
        "foo": {
            "source": "/Users/vecmezoni/Development/foo",
            "destination": "vecmezoni@my.host.ru:~/codebase"
        }
    }
}
```

`node index.js`

`foo` folder will be fully synced to the ~/codebase/foo of my.host.ru
