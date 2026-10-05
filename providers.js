const PROVIDERS = [
    {
        "id": "adp_workforce_now",
        "display_name": "ADP Workforce Now"
    },
    {
        "id": "adp_vantage",
        "display_name": "ADP Vantage"
    },
    {
        "id": "bamboo_hr",
        "display_name": "BambooHR"
    },
    {
        "id": "sapling",
        "display_name": "Sapling"
    },
    {
        "id": "trustpoint",
        "display_name": "Trustpoint"
    }
];

function providerDisplayName(providerId) {
    const provider = PROVIDERS.find(p => p.id === providerId);
    return provider ? provider.display_name : providerId;
}

module.exports = { PROVIDERS, providerDisplayName };