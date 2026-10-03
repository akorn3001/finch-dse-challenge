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

function managerName(individual, nameByIdMap) {
    const id = individual.manager?.id;
    if (!id) return null; //genuinely no manager
    return nameByIdMap.get(id) || id; //name if we have it, else the manager id
}

function yesNo(value) {
    if (value === null || value === undefined) return null;
    return value ? 'Yes' : 'No';
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

// Function responsible for handling null or missing values
function display(value) {
    if (value === null || value === undefined || value === '') {
        return '<span class="missing">Not provided</span>';
    }

    return escapeHtml(value);
}

function renderTable(headers, rows) {
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
        ${renderTable(['Name', 'Parent'], departmentRows)}
        <br>
        <h3>Locations</h3>
        ${renderTable(['Line 1', 'Line 2', 'City', 'State', 'Postal Code', 'Country'], locationRows)}
        <br>
        <h3>Accounts</h3>
        ${renderTable(['Routing Number', 'Account Name', 'Institution Name', 'Account Type', 'Account Number'], accountRows)}
    `;
}

function renderDirectory(directory) {
    const nameByIdMap = new Map(
        (directory.individuals || []).map(i => [i.id, `${i.first_name} ${i.last_name}`])
    );

    const individualRows = (directory.individuals || []).map(i => `
            <tr>
                <td>${display(i.first_name)}</td>
                <td>${display(i.middle_name)}</td>
                <td>${display(i.last_name)}</td>
                <td>${display(managerName(i, nameByIdMap))}</td>
                <td>${display(i.department?.name)}</td>
                <td class="is-active-parent"><span class="${i.is_active ? 'is-active' : 'not-active'}">${display(yesNo(i.is_active))}</span></td>
                <td><a href="/employee/${i.id}" aria-label="View details for ${display(i.first_name)} ${display(i.last_name)}">View</a></td>
            </tr>
        `);

    return `
            <h2>Directory</h2>
            <h3>Individuals</h3>
            ${renderTable(['First Name', 'Middle Name', 'Last Name', 'Manager', 'Department', 'Is Active?', ''], individualRows)}
        `;
}

function renderIndividual(individual) {
    const emailRows = (individual.emails || []).map(e => `
        <tr>
            <td>${display(e.type)}</td>
            <td>${display(e.data)}</td>
        </tr>
    `);

    const phoneNumberRows = (individual.phone_numbers || []).map(p => `
        <tr>
            <td>${display(p.type)}</td>
            <td>${display(p.data)}</td>
        </tr>
    `);

    return `
        <h2>Individual</h2>
        <p><span class="bold-label">Individual ID: </span>${display(individual.id)}</p>
        <p><span class="bold-label">First Name: </span>${display(individual.first_name)}</p>
        <p><span class="bold-label">Middle Name: </span>${display(individual.middle_name)}</p>
        <p><span class="bold-label">Last Name: </span>${display(individual.last_name)}</p>
        <p><span class="bold-label">Preferred Name: </span>${display(individual.preferred_name)}</p>
        <br>
        <h3>Emails</h3>
        ${renderTable(['Type', 'Email Address'], emailRows)}
        <br>
        <h3>Phone Numbers</h3>
        ${renderTable(['Type', 'Phone Number'], phoneNumberRows)}
        <br>
        <p><span class="bold-label">Gender: </span>${display(individual.gender)}</p>
        <p><span class="bold-label">Ethnicity: </span>${display(individual.ethnicity)}</p>
        <p><span class="bold-label">Marital Status: </span>${display(individual.marital_status)}</p>
        <p><span class="bold-label">Date of Birth: </span>${display(individual.dob)}</p>
        <br>
        <h3>Residence</h3>
        <p><span class="bold-label">Line 1: </span>${display(individual.residence?.line1)}</p>
        <p><span class="bold-label">Line 2: </span>${display(individual.residence?.line2)}</p>
        <p><span class="bold-label">City: </span>${display(individual.residence?.city)}</p>
        <p><span class="bold-label">State: </span>${display(individual.residence?.state)}</p>
        <p><span class="bold-label">Postal Code: </span>${display(individual.residence?.postal_code)}</p>
        <p><span class="bold-label">Country: </span>${display(individual.residence?.country)}</p>
    `;
}

module.exports = { page, display, renderCompany, renderDirectory, renderIndividual };