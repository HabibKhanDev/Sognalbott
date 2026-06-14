const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 🔐 APNI REAL BINANCE KEYS AAPKI JAGAHA PAR SET KAR DI HAIN
    const BINANCE_API_KEY = "1pusEFiom6jcibfG6eWtd0wlf216c75kT3FHq uCNcK9tDA2ZE1D1mVI7Dr2p6ydE";
    const BINANCE_SECRET_KEY = "abqSlhmVwc0YZG4RPNIfB4FivLKFCvTmbVb gpu57AcVHXJ0pg20sdJbEKbDxJsSv";
    const BINANCE_BASE_URL = 'https://fapi.binance.com';

    function generateSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // 🌍 GET Request: Live balance aur IP nikalne ke liye
    if (req.method === 'GET') {
        try {
            const ipRes = await axios.get('https://api.ipify.org?format=json');
            
            if (BINANCE_API_KEY === "Aapki_Real_Binance_API_Key_Yahan_Aayegi") {
                return res.status(200).json({ 
                    status: "Online", 
                    vercel_outbound_ip: ipRes.data.ip,
                    balance: "Setup Pending" 
                });
            }

            // Binance se Futures Balance nikalne ki request
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = generateSignature(queryString, BINANCE_SECRET_KEY);
            
            const balanceRes = await axios.get(`${BINANCE_BASE_URL}/fapi/v2/balance?${queryString}&signature=${signature}`, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // USDT balance dhoondna
            const usdtData = balanceRes.data.find(asset => asset.asset === 'USDT');
            const realBalance = usdtData ? parseFloat(usdtData.balance).toFixed(2) : "0.00";

            return res.status(200).json({ 
                status: "Execution Engine Online", 
                vercel_outbound_ip: ipRes.data.ip,
                balance: realBalance
            });

        } catch (err) {
            return res.status(500).json({ error: "Fetch failed", details: err.message });
        }
    }

    // 🚀 POST Request: Trade orders lagane ke liye
    if (req.method === 'POST') {
        const { symbol, type, entry, tp, sl, margin } = req.body;
        const pair = symbol.toUpperCase();

        if (BINANCE_API_KEY === "Aapki_Real_Binance_API_Key_Yahan_Aayegi") {
            return res.status(400).json({ success: false, error: "Please update API Keys!" });
        }

        try {
            const timestamp = Date.now();

            // 1. Set Leverage
            const leverageQuery = `symbol=${pair}&leverage=20&timestamp=${timestamp}`;
            const leverageSignature = generateSignature(leverageQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/leverage?${leverageQuery}&signature=${leverageSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 2. Quantity Calculate
            const targetValue = parseFloat(margin) * 20;
            let quantity = targetValue / parseFloat(entry);
            quantity = (pair.includes('PEPE') || pair.includes('SHIB')) ? Math.floor(quantity) : parseFloat(quantity.toFixed(3));

            const side = type === 'LONG' ? 'BUY' : 'SELL';
            const reverseSide = type === 'LONG' ? 'SELL' : 'BUY';

            // 3. Market Order
            const orderQuery = `symbol=${pair}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
            const orderSignature = generateSignature(orderQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${orderQuery}&signature=${orderSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 4. Take Profit Order
            const tpQuery = `symbol=${pair}&side=${reverseSide}&type=TAKE_PROFIT_MARKET&stopPrice=${parseFloat(tp).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const tpSignature = generateSignature(tpQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${tpQuery}&signature=${tpSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 5. Stop Loss Order
            const slQuery = `symbol=${pair}&side=${reverseSide}/type=STOP_MARKET&stopPrice=${parseFloat(sl).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const slSignature = generateSignature(slQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${slQuery}&signature=${slSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            return res.status(200).json({ success: true, message: `Orders placed for ${pair}` });

        } catch (error) {
            return res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
        }
    }
};
