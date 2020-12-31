# geeScripts
A collection of remote sensing, spatial analysis, and helper tools for Google Earth Engine.

## Usage
To import a script, include the following code in your GEE script:
```javascript
var foo = require("users/aazuspan/geeScripts:{script name}")
foo.bar();
```

For example:
```javascript
var burnSeverity = require("users/aazuspan/geeScripts:burnSeverity")
burnSeverity.calculateBurnSeverity( ... );
```
