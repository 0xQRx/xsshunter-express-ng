/**
 * Extension Importer Module
 * 
 * This module reads JavaScript extension files from the server/custom_extensions_js directory
 * and imports them into the database. Each file should have:
 * - // Name: <extension name>
 * - // Description: <extension description>
 * - The actual JavaScript code
 * 
 * Called automatically during server startup
 */

const fs = require('fs');
const path = require('path');
const database = require('../database.js');
const { minifyAndEncodeExtension } = require('./extension-utils.js');

const Extensions = database.Extensions;

// Directory containing the custom extension scripts
const EXTENSIONS_DIR = path.join(__dirname, '..', '..', 'custom-extensions-js');

// Color codes for output
const RED = '\033[0;31m';
const GREEN = '\033[0;32m';
const YELLOW = '\033[1;33m';
const BLUE = '\033[0;34m';
const NC = '\033[0m'; // No Color

/**
 * Extract metadata from extension file
 * @param {string} content - File content
 * @returns {object} - { name, description, code }
 */
function extractExtensionMetadata(content) {
    const lines = content.split('\n');
    let name = '';
    let description = '';
    let codeStartIndex = 0;
    
    // Look for Name and Description comments
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('// Name:')) {
            name = line.replace('// Name:', '').trim();
        } else if (line.startsWith('// Description:')) {
            description = line.replace('// Description:', '').trim();
            // Assume code starts after description line
            codeStartIndex = i + 1;
            // Skip any empty lines after description
            while (codeStartIndex < lines.length && lines[codeStartIndex].trim() === '') {
                codeStartIndex++;
            }
            break;
        }
    }
    
    // Extract the actual code (everything after the metadata comments)
    const code = lines.slice(codeStartIndex).join('\n').trim();
    
    return { name, description, code };
}

/**
 * Import a single extension file
 * @param {string} filePath - Path to the extension file
 * @returns {Promise<boolean>} - Success status
 */
async function importExtension(filePath) {
    const fileName = path.basename(filePath);
    
    try {
        console.log(`${BLUE}[INFO]${NC} Processing ${fileName}...`);
        
        // Read the file
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract metadata
        const { name, description, code } = extractExtensionMetadata(content);
        
        if (!name || !code) {
            console.log(`${YELLOW}[WARNING]${NC} Skipping ${fileName} - missing name or code`);
            return false;
        }
        
        // Check if extension with this name already exists
        const existingExtension = await Extensions.findOne({
            where: { name }
        });
        
        if (existingExtension) {
            console.log(`${YELLOW}[SKIP]${NC} Extension "${name}" already exists in database`);
            return false;
        }
        
        // Minify and encode the extension
        const minifiedCode = await minifyAndEncodeExtension(code);
        
        // Create the extension in the database
        await Extensions.create({
            name,
            description: description || `Imported from ${fileName}`,
            code,
            minified_code: minifiedCode,
            is_active: false // Default to inactive, user can enable in UI
        });
        
        console.log(`${GREEN}[SUCCESS]${NC} Imported extension: ${name}`);
        return true;
        
    } catch (error) {
        console.error(`${RED}[ERROR]${NC} Failed to import ${fileName}:`, error.message);
        return false;
    }
}

/**
 * Main import function for server startup
 * This is a simplified version that runs during server initialization
 */
async function importExtensionsOnStartup() {
    // Check if extensions directory exists
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        console.log(`${YELLOW}[Extension Import]${NC} Extensions directory not found, skipping import`);
        return;
    }
    
    // Read all .js files from the extensions directory
    const files = fs.readdirSync(EXTENSIONS_DIR)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(EXTENSIONS_DIR, file));
    
    if (files.length === 0) {
        return;
    }
    
    console.log(`${BLUE}[Extension Import]${NC} Checking ${files.length} extension files...`);
    
    // Import each extension
    let successCount = 0;
    let skipCount = 0;
    
    for (const file of files) {
        const fileName = path.basename(file);
        
        try {
            // Read the file
            const content = fs.readFileSync(file, 'utf8');
            
            // Extract metadata
            const { name, description, code } = extractExtensionMetadata(content);
            
            if (!name || !code) {
                continue;
            }
            
            // Check if extension with this name already exists
            const existingExtension = await Extensions.findOne({
                where: { name }
            });
            
            if (existingExtension) {
                skipCount++;
                continue;
            }
            
            // Minify and encode the extension
            const minifiedCode = await minifyAndEncodeExtension(code);
            
            // Create the extension in the database
            await Extensions.create({
                name,
                description: description || `Imported from ${fileName}`,
                code,
                minified_code: minifiedCode,
                is_active: false // Default to inactive, user can enable in UI
            });
            
            successCount++;
            
        } catch (error) {
            console.error(`${YELLOW}[Extension Import]${NC} Failed to import ${fileName}:`, error.message);
        }
    }
    
    // Only show summary if there were changes
    if (successCount > 0) {
        console.log(`${GREEN}[Extension Import]${NC} Imported ${successCount} new extensions (inactive by default)`);
    }
    if (skipCount > 0 && successCount === 0) {
        console.log(`${BLUE}[Extension Import]${NC} All ${skipCount} extensions already exist in database`);
    }
}

// Export the startup function
module.exports = {
    importExtensionsOnStartup
};