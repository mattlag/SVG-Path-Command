# SVG-Path-Command
This library will do a few things on the `d` attribute of `path` or `glyph` elements 
to make it more readable by people.

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
Main functionality will contained in `svg-path-command.js`.  To quickly convert a single SVG file, `convert.htm` will allow you to drag-and-drop your file, convert, and download a new file easily.  There will also be a test suite of SVG files that will be run through `test.htm` to ensure all the code is behaving as expected.