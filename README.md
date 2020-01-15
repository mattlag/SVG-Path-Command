# SVG-Path-Command
This library will do a few things on the `d` attribute of `path` or `glyph` elements 
to make it more readable by people. Check out the `d` article on MDN for more 
info: [svg/attribute/d](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d)

### Readability
 - Convert relative commands `mlhvcsqtaz` to absolute commands `MLHVCSQTAZ`
 - Convert chains of parameters to individual command / parameter pairs
 - Optionally add line breaks between each command

### Converting commands
 - Convert Horizontal and Vertical LineTo commands `V` or `H` to regular LineTo commands `L` with both x/y values
 - Convert Smooth Cubic Bézier commands `S` to regular Cubic Bézier commands `C`
 - Convert Smooth Quadratic Bézier commands `T` to regular Quadratic Bézier commands `Q`

### Potentially lossy
 - Convert Quadratic Bézier `Q` commands to Cubic Bézier commands `C` (this may involve some approximation)
 - Convert Elliptical Arc commands `A` to Cubic Bézier commands `C` (this involves a fair amount of approximation)


# Project
Main functionality will contained in `svg-path-command.js`:

 - `convertSVGPathCommands` function takes the text from a `d` attribute and converts it (based on an `options` argument)
 - `convertSVGDocument` function takes the text from an entire SVG document and runs `convertSVGPathCommands` on each `d` attribute it finds.

Additionally there are two helper HTML files:
 - To quickly convert a single SVG file, `convert.htm` will allow you to drag-and-drop your file, convert, and download a new file easily.
 - There is also a test suite of SVG files that run through `test.htm` to ensure all the code is behaving as expected.