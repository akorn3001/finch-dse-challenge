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

module.exports = { page };