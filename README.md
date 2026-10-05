# Finch DSE Take-Home Assignment - Alex Kornfeld
Small express app built to satisfy the requirements of the Finch take-home assignment for the Developer Success Engineer role.

## Prerequisites
- Node version 18+
- Finch developer account with access to client_id and client_secret

## Packages Used
- express
- dotenv
- cookie-parser

All packages used are open-source and MIT

## Setup
- Clone this repository
- In your terminal, navigate to the project folder and run `npm install`
- Copy the `.env.example` file to a `.env` file. Fill in the *FINCH_CLIENT_ID* and *FINCH_CLIENT_SECRET* values with your actual credentials from your Finch developer account
- In your Finch developer account, under the Credentials tab, add the redirect URI: http://localhost:3000/callback.
- In the terminal, run the command `npm start` to start the local server.
- In your web browser navigate to http://localhost:3000.

## How to use the application
- On the home page of the app, select **ADP Workforce Now** and click the **Continue** button
- To log in, use *good_user* and *good_pass* as the username and password, respectively. This will redirect you to the application's `/dashboard` page which will show all **Company** and **Directory** data.
- At the top of the page are two links, one which tests `/payment` calls which should fail with a `403` error, and the other which tests `/benefits` calls which should fail with a `501` error (provider-dependent).
- In the Directory section you will see individuals whom you can click on. Clicking on any of these individuals will redirect you to the `/individual/:id` page where you will see all **Individual** and **Employment** data for that individual.

## Design Decisions
### Raw fetch over the SDK
- I decided to use raw fetches over the finch SDK so that error handling and auth are explicit.
### Token Storage
- Because Finch requires backend-only storage, this application uses a server-side Map with an `httpOnly` cookie, so the token never reaches the browser. `{ secure: true }` was omitted because localhost is HTTP. In production the token would be encrypted at rest in a database.
### Scope Restriction
- Scope restriction is enforced at session creation, not in code. This ensures that the token can't reach the `/payment` or `/pay-statement` endpoints. Because Finch scopes per product, excluding **payment** also excludes `/pay-groups` and `/pay-statement-item`.
### Hardcoded providers list
- At the time of testing, calling the `/providers` endpoint returns 291 providers, many of which error out at the time of log-in. I decided it would be more manageable to show several providers instead of the full list.
### Why is 'benefits' in the products array?
- I made the decision to add **benefits** to the products array for the purposes of demonstrating 501 error handling by testing providers who haven't implemented this endpoint.
### Null Handling
- A null value means the API didn't return that field, not that something failed - so the field is displayed with *Not Provided* rather than hidden, which tells the user the field exists but wasn't populated. Empty arrays are a third case, shown as *None listed*, since the provider **did** return the field and it's genuinely empty. `/providers` publishes `supported_fields` per provider, which is where most of these gaps actually come from.
### Error Handling
- I created a `FinchError` class which extends `Error`. This shows status-based messages. On pages that call multiple endpoints (the dashboard calls `/company` and `/directory`, the individual page calls `/individual` and `/employment`) I use `Promise.allSettled` so each section fails independently (e.g. a 501 on one section still lets the other render).
- `/test/payment` and `/test/benefits` exist to demonstrate error handling, not to display data. I didn't choose to display any fields for these endpoints since they're primarily used for error handling, not field display.
### Account Masking
- For certain sensitive fields like `account_number` and `routing_number` I created the function `maskSensitive(value)` which only shows the last few numbers of a value, and the rest of the digits show ••••.
### Income Data Handling
- I use a `formatIncome(income)` function to properly format income amounts (e.g. 1234567 becomes $12,345.67)
### Manager Handling
- Because the directory returns individuals with manager ids, I resolved these ids against the directory to show manager name instead to be more human-readable in the table. Falls back to the ID when the manager is outside the directory response. 
### Overlapping fields
- Because **Individual** and **Employment** have some overlapping fields, I decided to only show the same fields once on the `/individual/:id` page so as not to be redundant.

## What I would do with more time
- Resolve manager names on the `/individual/:id` page by caching the directory in the session.
- Map snake_case enum values to display labels
- Loop over `offset` to fetch all directory pages
- Use `supported_fields` from `/providers` to show *why* a field is missing rather than a generic "Not provided"
- Retry with backoff on 429 and 5xx
- Persist sessions rather than in-memory
- Fetching the provider list live instead of hardcoding a smaller subset.
- More tests around the error-mapping layer.

## Other observations
- The redirect URI must match exactly. The error names the field but not what it received vs what was registered.
- "Product" means different things in the documentation (e.g. Organization, Payroll, Deductions, Documents) as it does in the scope parameter. Deductions maps to a scope called 'benefits'. `/employer/plans` is documented under **Benefits** but needs its own `plans` scope.
- Finch validates requested scopes against the provider when the Connect session is created, so an unsupported product fails up front with a 400 rather than a 501 at request time. The error body includes `context.unsupportedProducts`, naming exactly which products to drop - structured enough that a client could strip them and retry automatically. That means 501 only appears for providers that declare support and then don't deliver it, which is where I saw it with ADP Workforce Now.
- I connected with a provider (Personio) whose product scoping omits company and I still received company data anyway. Benefits was the one place I was able to surface a 501 error
- `/providers` publishes `supported_fields` which explains most of the nulls