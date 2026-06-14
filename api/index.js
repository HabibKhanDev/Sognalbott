const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    // ⚙️ CORS Headers taake Spck Editor ka dashboard isko access kar sake
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 🕒 Temporary Keys (Binance API milne ke baad aap yahan real keys dalenge)
    const BINANCE_API_KEY = "TEMP_API_KEY";
    const BINANCE_SECRET_KEY = "TEMP_SECRET_KEY";
    const BINANCE_BASE_URL = 'https://fapi.binance.com';

    function generateSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // 🌍 GET Request: Is se hamien direct browser mein IP address mil jayega
    if (req.method === 'GET') {
        try {
            const ipRes = await axios.get('https://api.ipify.org?format=json');
            return res.status(200).json({ 
                status: "Execution Engine Online via Vercel", 
                vercel_outbound_ip: ipRes.data.ip 
            });
        } catch (err) {
            return res.status(500).json({ error: "IP fetch failed", details: err.message });
        }
    }

    // 🚀 POST Request: Jab dashboard se trade signal aayega
    if (req.method === 'POST') {
        const { symbol, type, entry, tp, sl, margin } = req.body;
        const pair = symbol.toUpperCase();

        if (BINANCE_API_KEY === "TEMP_API_KEY") {
            return res.status(400).json({ success: false, error: "Please update your real Binance API Keys first!" });
        }

        try {
            const timestamp = Date.now();

            // 1. Set Leverage to 20x
            const leverageQuery = `symbol=${pair}&leverage=20&timestamp=${timestamp}`;
            const leverageSignature = generateSignature(leverageQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/leverage?${leverageQuery}&signature=${leverageSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 2. Quantity Calculate Karein
            const targetValue = parseFloat(margin) * 20;
            let quantity = targetValue / parseFloat(entry);
            if (pair.includes('PEPE') || pair.includes('SHIB')) {
                quantity = Math.floor(quantity);
            } else {
                quantity = parseFloat(quantity.toFixed(3));
            }

            const side = type === 'LONG' ? 'BUY' : 'SELL';
            const reverseSide = type === 'LONG' ? 'SELL' : 'BUY';

            // 3. Place Market Order
            const orderQuery = `symbol=${pair}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
            const orderSignature = generateSignature(orderQuery, BINANCE_SECRET_KEY);
            const marketOrder = await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${orderQuery}&signature=${orderSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 4. Place Take Profit Order
            const tpQuery = `symbol=${pair}&side=${reverseSide}&type=TAKE_PROFIT_MARKET&stopPrice=${parseFloat(tp).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const tpSignature = generateSignature(tpQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${tpQuery}&signature=${tpSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 5. Place Stop Loss Order
            const slQuery = `symbol=${pair}&side=${reverseSide}&type=STOP_MARKET&stopPrice=${parseFloat(sl).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const slSignature = generateSignature(slQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${slQuery}&signature=${slSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            return res.status(200).json({ success: true, message: `All orders placed on Binance for ${pair}` });

        } catch (error) {
            return res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
        }
    }
};
