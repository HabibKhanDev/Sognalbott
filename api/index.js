const axios = require('axios');
const crypto = require('crypto');


module.exports = async (req, res) => {
    // CORS Headers setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 🔐 Binance Keys aur API Engine Configurations
    const BINANCE_API_KEY = "1pusEFiom6jcibfG6eWtd0wlf216c75kT3FHq uCNcK9tDA2ZE1D1mVI7Dr2p6ydE";
    const BINANCE_SECRET_KEY = "abqSlhmVwc0YZG4RPNIfB4FivLKFCvTmbVb gpu57AcVHXJ0pg20sdJbEKbDxJsSv";
    const BINANCE_BASE_URL = 'https://fapi.binance.usdt';

    function generateSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // 📊 Pine Script ke Liquidity-Anchored Trailing Stop ka exact JavaScript Translation
    async function getLiquidityAnchoredStop(symbol) {
        try {
            // Pine inputs default values setup: atrLength = 14, mult1 = 6.5
            const atrLength = 14;
            const mult1 = 6.5;
            const mult4 = mult1 + 3; // Incremental offsets logic

            const url = `${BINANCE_BASE_URL}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=1h&limit=300`;
            const response = await axios.get(url);
            const klines = response.data; // [time, open, high, low, close, volume, ...]

            if (klines.length < 50) return { trend: 1, ts4: 0 };

            // 1. ATR (Average True Range) Calculation
            let trueRanges = [];
            for (let i = 1; i < klines.length; i++) {
                let high = parseFloat(klines[i][2]);
                let low = parseFloat(klines[i][3]);
                let prevClose = parseFloat(klines[i-1][4]);
                
                let tr = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                trueRanges.push(tr);
            }

            // Simple Moving Average for ATR
            let atrValues = new Array(trueRanges.length).fill(0);
            let sum = 0;
            for(let i=0; i<atrLength; i++) sum += trueRanges[i];
            atrValues[atrLength-1] = sum / atrLength;

            for(let i = atrLength; i < trueRanges.length; i++) {
                let currentAtrSum = 0;
                for(let j = i - atrLength + 1; j <= i; j++) {
                    currentAtrSum += trueRanges[j];
                }
                atrValues[i] = currentAtrSum / atrLength;
            }

            // 2. Trailing Stop Engine Simulation Loop (Pine Script matching state logic)
            let trend = 1; 
            let ts4 = 0;
            let ts4Values = [];

            // Shuruati data populate karna
            let firstSrc = parseFloat(klines[1][4]);
            let firstAtr = atrValues[0] || (parseFloat(klines[1][2]) - parseFloat(klines[1][3]));
            ts4 = firstSrc - (firstAtr * mult4);

            for (let i = 1; i < klines.length; i++) {
                let src = parseFloat(klines[i][4]); // close price source
                let high = parseFloat(klines[i][2]);
                let low = parseFloat(klines[i][3]);
                let atr = atrValues[i-1] || firstAtr;

                let upper4 = src - (atr * mult4);
                let lower4 = src + (atr * mult4);

                let prevTs4 = ts4;

                if (trend === 1) {
                    if (src < prevTs4) {
                        trend = -1;
                        ts4 = lower4;
                    } else {
                        ts4 = Math.max(upper4, prevTs4);
                    }
                } else {
                    if (src > prevTs4) {
                        trend = 1;
                        ts4 = upper4;
                    } else {
                        ts4 = Math.min(lower4, prevTs4);
                    }
                }
                ts4Values.push(ts4);
            }

            return {
                trend: trend, // 1 = Bullish Trend (Long), -1 = Bearish Trend (Short)
                ts4: ts4      // Exits aur calculation line target ke liye stop value
            };

        } catch (e) {
            console.error("Pine Math Parse Error:", e.message);
            return { trend: 1, ts4: 0 };
        }
    }

    // 🌍 GET Request Engine: Dashboard balances aur signals sync karne ke liye
    if (req.method === 'GET') {
        try {
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = generateSignature(queryString, BINANCE_SECRET_KEY);
            
            const balanceRes = await axios.get(`${BINANCE_BASE_URL}/fapi/v2/balance?${queryString}&signature=${signature}`, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            const usdtData = balanceRes.data.find(asset => asset.asset === 'USDT');
            const realBalance = usdtData ? parseFloat(usdtData.balance).toFixed(2) : "0.00";

            let symbol = req.query.symbol || 'BTCUSDT';
            const scriptData = await getLiquidityAnchoredStop(symbol);

            return res.status(200).json({ 
                status: "Execution Engine Online", 
                balance: realBalance,
                trend: scriptData.trend,
                ts4: scriptData.ts4
            });
        } catch (err) {
            return res.status(200).json({ status: "Offline/Setup Issue", balance: "0.00", trend: 1, ts4: 0 });
        }
    }

    // 🚀 POST Request Engine: Binance Futures automated orders routing execution
    if (req.method === 'POST') {
        const { symbol, type, entry, tp, sl, margin } = req.body;
        const pair = symbol.toUpperCase();

        try {
            const timestamp = Date.now();
            
            // Leverage Setting
            const leverageQuery = `symbol=${pair}&leverage=20&timestamp=${timestamp}`;
            const leverageSignature = generateSignature(leverageQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/leverage?${leverageQuery}&signature=${leverageSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // Quantity Logic matching margin rules
            const targetValue = parseFloat(margin) * 20;
            let quantity = targetValue / parseFloat(entry);
            quantity = (pair.includes('PEPE') || pair.includes('SHIB')) ? Math.floor(quantity) : parseFloat(quantity.toFixed(3));

            const side = type === 'LONG' ? 'BUY' : 'SELL';
            const reverseSide = type === 'LONG' ? 'SELL' : 'BUY';

            // 1. Main Entry Execution (Market Order)
            const orderQuery = `symbol=${pair}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
            const orderSignature = generateSignature(orderQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${orderQuery}&signature=${orderSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 2. Take Profit Bracket Setup
            const tpQuery = `symbol=${pair}&side=${reverseSide}&type=TAKE_PROFIT_MARKET&stopPrice=${parseFloat(tp).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const tpSignature = generateSignature(tpQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${tpQuery}&signature=${tpSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            // 3. Stop Loss Anchored Bracket Setup
            const slQuery = `symbol=${pair}&side=${reverseSide}&type=STOP_MARKET&stopPrice=${parseFloat(sl).toFixed(4)}&closePosition=true&timestamp=${timestamp}`;
            const slSignature = generateSignature(slQuery, BINANCE_SECRET_KEY);
            await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order?${slQuery}&signature=${slSignature}`, {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
            });

            return res.status(200).json({ success: true, message: `Liquidity stop orders deployed on ${pair}` });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
        }
    }
};
