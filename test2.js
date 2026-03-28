const email = 'temp' + Date.now() + '@example.com';
const password = 'Password123!';

async function runTest() {
    let res = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firstName: 'Temp',
            lastName: 'User',
            email: email,
            password: password,
            phone: 9999999999,
            role: 'CUSTOMER'
        })
    });
    console.log("Register Auth:", await res.text());

    res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log("Login Token:", data.token.substring(0, 15) + "...");

    res = await fetch('http://localhost:8080/api/policies/purchase', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + data.token
        },
        body: JSON.stringify({
            policyTypeId: 1,
            coverageAmount: 100000.00,
            paymentFrequency: "MONTHLY",
            startDate: "2026-03-28",
            nomineeName: "Jane Doe",
            nomineeRelation: "Spouse"
        })
    });
    console.log("Purchase Status: " + res.status);
    console.log("Purchase Text:", await res.text());
}

runTest().catch(console.error);
