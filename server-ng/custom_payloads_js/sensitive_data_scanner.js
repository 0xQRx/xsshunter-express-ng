// Name: Sensitive Data Scanner
// Description: Scans page content for sensitive information including emails, phone numbers, JWT tokens, API keys, credit card fields, and hidden form inputs

function scanSensitiveData() {
  const sensitive = {
    credentials: {},
    personalInfo: {},
    technicalInfo: {},
    hiddenInputs: []
  };
  
  // Regular expressions for different data types
  const patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ipv4: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    jwt: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    apiKey: /[a-zA-Z0-9]{32,}/g,
    privateKey: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g
  };
  
  // Scan page text content
  const pageText = document.body.innerText;
  
  // Extract emails (limit to 5 for privacy)
  const emails = pageText.match(patterns.email);
  if (emails) sensitive.personalInfo.emails = [...new Set(emails)].slice(0, 5);
  
  // Check for JWT tokens
  const jwts = pageText.match(patterns.jwt);
  if (jwts) sensitive.credentials.jwtTokens = jwts.map(jwt => jwt.substring(0, 20) + '...');
  
  // Scan all input fields
  document.querySelectorAll('input').forEach(input => {
    // Collect hidden inputs (often contain tokens/IDs)
    if (input.type === 'hidden' && input.value) {
      sensitive.hiddenInputs.push({
        name: input.name,
        value: input.value.substring(0, 50) // Truncate for safety
      });
    }
    
    // Check for credit card fields
    if (input.name?.toLowerCase().includes('card') || 
        input.placeholder?.toLowerCase().includes('card')) {
      sensitive.personalInfo.hasCreditCardField = true;
    }
    
    // Check for password fields with values
    if (input.type === 'password' && input.value) {
      sensitive.credentials.passwordFieldsFilled = true;
    }
  });
  
  // Check meta tags for technical info
  document.querySelectorAll('meta').forEach(meta => {
    if (meta.name === 'generator') sensitive.technicalInfo.generator = meta.content;
    if (meta.name === 'framework') sensitive.technicalInfo.framework = meta.content;
    if (meta.name?.includes('version')) sensitive.technicalInfo[meta.name] = meta.content;
  });
  
  addCustomData({
    title: "Sensitive Data Scan",
    data: sensitive
  });
}
scanSensitiveData();