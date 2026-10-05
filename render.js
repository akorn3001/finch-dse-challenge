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

function errorMessage(error, providerName, product) {
    switch (error.status) {
        case 501:
            return `${providerName} doesn't support ${product} data through Finch.`;
        case 403:
            return `This application wasn't granted access to ${product} data.`;
        case 202:
            return `${product} data is still syncing from ${providerName}. Check back shortly.`;
        case 401:
            return `The connection to ${providerName} needs to be re-authorized.`;
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        default:
            return `Something went wrong retrieving ${product} data.`;
    }
}

function renderError(product, error, providerName) {
    return `
        <div class="error-box">
            <p>${error.status} error: ${escapeHtml(errorMessage(error, providerName, product))}</p>
            <p class="error-detail">${escapeHtml(error.message)}</p>
        </div>
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

function formatIncome(income) {
    if (!income || income.amount === null || income.amount === undefined) return null;
    const amount = (income.amount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: (income.currency || 'usd').toUpperCase(),
    });
    return `${amount}`;
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
        <p><span class="bold-label">Entity Subtype: </span>${display(company.entity?.subtype)}</p>
        <p><span class="bold-label">EIN: </span>${display(company.ein)}</p>
        <p><span class="bold-label">Primary Email: </span>${display(company.primary_email)}</p>
        <p><span class="bold-label">Primary Phone Number: </span>${display(company.primary_phone_number)}</p>
        <br>
        <h3>Departments</h3>
        ${renderTable(['Name', 'Parent'], departmentRows)}
        <h3>Locations</h3>
        ${renderTable(['Line 1', 'Line 2', 'City', 'State', 'Postal Code', 'Country'], locationRows)}
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
                <td><a href="/individual/${i.id}" aria-label="View details for ${escapeHtml(i.first_name || '')} ${escapeHtml(i.last_name || '')}">View</a></td>
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
        <h3>Emails</h3>
        ${renderTable(['Type', 'Email Address'], emailRows)}
        <h3>Phone Numbers</h3>
        ${renderTable(['Type', 'Phone Number'], phoneNumberRows)}
        <br>
        <p><span class="bold-label">Gender: </span>${display(individual.gender)}</p>
        <p><span class="bold-label">Ethnicity: </span>${display(individual.ethnicity)}</p>
        <p><span class="bold-label">Marital Status: </span>${display(individual.marital_status)}</p>
        <p><span class="bold-label">Date of Birth: </span>${display(individual.dob)}</p>
        <h3>Residence</h3>
        <p><span class="bold-label">Line 1: </span>${display(individual.residence?.line1)}</p>
        <p><span class="bold-label">Line 2: </span>${display(individual.residence?.line2)}</p>
        <p><span class="bold-label">City: </span>${display(individual.residence?.city)}</p>
        <p><span class="bold-label">State: </span>${display(individual.residence?.state)}</p>
        <p><span class="bold-label">Postal Code: </span>${display(individual.residence?.postal_code)}</p>
        <p><span class="bold-label">Country: </span>${display(individual.residence?.country)}</p>
    `;
}

function renderEmployment(employment) {
    const incomeHistoryRows = (employment.income_history || []).map(h => `
        <tr>
            <td>${display(h.unit)}</td>
            <td>${display(formatIncome(h))}</td>
            <td>${display(h.currency)}</td>
            <td>${display(h.effective_date)}</td>
        </tr>
        `);

    const customFieldRows = (employment.custom_fields || []).map(c => `
            <tr>
                <td>${display(c.name)}</td>
                <td>${display(c.value)}</td>
            </tr>
        `);

    return `
        <h2>Employment</h2>
        <p><span class="bold-label">Title: </span>${display(employment.title)}</p>
        <p><span class="bold-label">Manager: </span>${display(employment.manager?.id)}</p>
        <p><span class="bold-label">Department: </span>${display(employment.department?.name)}</p>
        <p><span class="bold-label">Employment Type: </span>${display(employment.employment?.type)}</p>
        <p><span class="bold-label">Employment Subtype: </span>${display(employment.employment?.subtype)}</p>
        <p><span class="bold-label">Start Date: </span>${display(employment.start_date)}</p>
        <p><span class="bold-label">End Date: </span>${display(employment.end_date)}</p>
        <p><span class="bold-label">Latest Rehire Date: </span>${display(employment.latest_rehire_date)}</p>
        <p><span class="bold-label">Employment Status: </span>${display(employment.employment_status)}</p>
        <p><span class="bold-label">FLSA Status: </span>${display(employment.flsa_status)}</p>
        <p><span class="bold-label">Union Code: </span>${display(employment.union_code)}</p>
        <p><span class="bold-label">Union Local: </span>${display(employment.union_local)}</p>
        <p><span class="bold-label">Highly Compensated Employee: </span>${display(yesNo(employment.highly_compensated_employee))}</p>
        <p><span class="bold-label">Key Employee: </span>${display(yesNo(employment.key_employee))}</p>
        <p><span class="bold-label">Class Code: </span>${display(employment.class_code)}</p>
        <h3>Location</h3>
        <p><span class="bold-label">Line 1: </span>${display(employment.location?.line1)}</p>
        <p><span class="bold-label">Line 2: </span>${display(employment.location?.line2)}</p>
        <p><span class="bold-label">City: </span>${display(employment.location?.city)}</p>
        <p><span class="bold-label">State: </span>${display(employment.location?.state)}</p>
        <p><span class="bold-label">Postal Code: </span>${display(employment.location?.postal_code)}</p>
        <p><span class="bold-label">Country: </span>${display(employment.location?.country)}</p>
        <h3>Income</h3>
        <p><span class="bold-label">Unit: </span>${display(employment.income?.unit)}</p>
        <p><span class="bold-label">Amount: </span>${display(formatIncome(employment.income))}</p>
        <p><span class="bold-label">Currency: </span>${display(employment.income?.currency)}</p>
        <p><span class="bold-label">Effective Date: </span>${display(employment.income?.effective_date)}</p>
        <h3>Income History</h3>
        ${renderTable(['Unit', 'Amount', 'Currency', 'Effective Date'], incomeHistoryRows)}
        <h3>Custom Fields</h3>
        ${renderTable(['Name', 'Value'], customFieldRows)}
        <br>
        <p><span class="bold-label">Source ID: </span>${display(employment.source_id)}</p>
        <p><span class="bold-label">Is Active? </span>${display(yesNo(employment.is_active))}</p>
        
    `;
}

function renderPayment(payment) {
    return `<h2>Payment</h2><br><h3>Payment data would go here</h3>`;
}

function renderBenefits(benefits) {
    return `<h2>Benefits</h2><h3>Benefits data would go here</h3>`;
}

module.exports = { page, display, escapeHtml, renderError, renderCompany, renderDirectory, renderIndividual, renderEmployment, renderPayment, renderBenefits };