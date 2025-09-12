const { minify } = require('terser');

// Helper function to minify and base64 encode JavaScript code
async function minifyAndEncodeExtension(code) {
    try {
        // Minify the code using terser with aggressive settings
        const minified = await minify(code, {
            compress: {
                drop_console: false, // Keep console statements since payloads might use them
                drop_debugger: true,
                passes: 3, // Multiple passes for better compression
                pure_funcs: null,
                hoist_funs: true,
                hoist_vars: true,
                if_return: true,
                join_vars: true,
                reduce_vars: true,
                collapse_vars: true,
                dead_code: true,
                conditionals: true,
                evaluate: true,
                sequences: true,
                properties: true,
                comparisons: true,
                inline: true,
                unused: true,
                loops: true,
                switches: true,
                booleans: true,
                arrows: true,
                keep_fargs: false,
                keep_infinity: false
            },
            mangle: {
                toplevel: true, // Mangle top level variable names
                eval: true,
                properties: {
                    regex: /^_/ // Mangle properties starting with underscore
                }
            },
            format: {
                comments: false,
                semicolons: false, // Use ASI where possible
                shorthand: true,
                wrap_iife: false,
                wrap_func_args: false
            },
            toplevel: true,
            module: false
        });
        
        // Convert to base64
        const base64Encoded = Buffer.from(minified.code || code).toString('base64');
        return base64Encoded;
    } catch (error) {
        console.error('Failed to minify extension:', error);
        // If minification fails, just base64 encode the original
        return Buffer.from(code).toString('base64');
    }
}

module.exports = {
    minifyAndEncodeExtension
};