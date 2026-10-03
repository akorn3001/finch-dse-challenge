function page(title, body) {
    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>${title}</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <main>${body}</main>
        </body>
    </html>
    `;
}

// Function to mask potentially sensitive values, like routing number and account number
function maskSensitive(value) {
    if (!value) return null;
    const str = String(value);
    return '••••' + str.slice(-4);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function display(value) {
    if (value === null || value === undefined || value === '') {
        return '<span class="missing">Not provided</span>';
    }

    return escapeHtml(value);
}

function renderTable (headers, rows) {
    if (rows.length === 0) return '<p>None listed</p>';
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    return `<table><tr>${headerRow}</tr>${rows.join('')}</table>`;
}

function renderCompany(company) {
    const departmentRows = (company.departments || []).map(d => `
        <tr>
            <td>${display(d.name)}</td>
            <td>${display(d.parent?.name)}</td>
        </tr>
        `);

    const locationRows = (company.locations || []).map(l => `
            <tr>
                <td>${display(l.line1)}</td>
                <td>${display(l.line2)}</td>
                <td>${display(l.city)}</td>
                <td>${display(l.state)}</td>
                <td>${display(l.postal_code)}</td>
                <td>${display(l.country)}</td>                               
            </tr>
            `);

    const accountRows = (company.accounts || []).map(a => `
            <tr>
                <td>${display(maskSensitive(a.routing_number))}</td>
                <td>${display(a.account_name)}</td>
                <td>${display(a.institution_name)}</td>
                <td>${display(a.account_type)}</td>
                <td>${display(maskSensitive(a.account_number))}</td>
            </tr>
        `);

    return `
    <h2>Company</h2>
    <p><span class="bold-label">Legal Name: </span>${display(company.legal_name)}</p>
    <p><span class="bold-label">Entity Type: </span>${display(company.entity?.type)}</p>
    <p><span class="bold-label">Entity Sub-Type: </span>${display(company.entity?.subtype)}</p>
    <p><span class="bold-label">EIN: </span>${display(company.ein)}</p>
    <p><span class="bold-label">Primary Email: </span>${display(company.primary_email)}</p>
    <p><span class="bold-label">Primary Phone Number: </span>${display(company.primary_phone_number)}</p>
    <br>
    <h3>Departments</h3>
        ${renderTable(['Name','Parent'], departmentRows)}
    <br>
    <h3>Locations</h3>
        ${renderTable(['Line 1', 'Line 2', 'City', 'State', 'Postal Code', 'Country'], locationRows)}
    <br>
    <h3>Accounts</h3>
        ${renderTable(['Routing Number', 'Account Name', 'Institution Name', 'Account Type', 'Account Number'], accountRows)}
    `;
}



module.exports = { page, display, renderCompany };