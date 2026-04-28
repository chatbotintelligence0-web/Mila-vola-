const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");

async function startBot() {
    // Railway dia mampiasa an'ity folder ity hitahirizana ny session
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        //browser: ["Ubuntu", "Chrome", "121.0.6167.160"],
        browser: ["Mac OS", "Safari", "17.4.1"],
    });

    // PAIRING CODE LOGIC - Hamarino tsara ny laharana eto
    if (!sock.authState.creds.registered) {
        const phoneNumber = "261382266876"; 
        console.log("Maka ny Pairing Code ho an'ny: " + phoneNumber);
        
        // Miandry kely 10 segondra vao mangataka
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log("\n=============================");
                console.log("NY PAIRING CODE-NAO DIA:", code);
                console.log("=============================\n");
            } catch (err) {
                console.log("Misy olana kely ny serveur. Andramo indray afaka 5 minitra.");
            }
        }, 10000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const sender = msg.key.participant || jid;

        // --- HAFATRA ANNONCE FENO ---
        const announcement = "FAMPANDRENESANA LEHIBE - NEXUS MADA\n\n" +
        "1. Noho ny olana misy teo amin'ny compte NEXUS teo aloha dia nanapakevitra izahay namindra ny NEXUS amin'ny seveur hafa. Noho izany nisy zavatra niova tao, toy ny: base de données, stokage sns...\n\n" +
        "2. Noho fioavan'ireo base de données ireo dia voafafa ny mombamomba atsika teo aloha ka tsy afaka miditra amin'izny intsony ianao.\n\n" +
        "3. Fa amizao dia mila mamerina manao inscription indray ianao amin'ity lien d'inscription ity ihany fa tsy amin'i taloha iny intsony:\n" +
        "https://nexusmada.vercel.app?ref=be-ge116\n\n" +
        "4. Zava-misy mety hiverina zero ny compte nao, fa aza mataotra fa omena bonus daholy ianareo rehetra.\n\n" +
        "5. Ho an'i mpandefa asa dia mandefa message privé aty aminay mba afahana mampiditra indray ilay depot anao ao amin'i NEXUS, ary afahanao mamerina mandefa ilay asa indray ao izany.\n\n" +
        "TOROLALANA (GUIDE):\n" +
        "Azonao jerena ato ny torolalana rehetra (Installation, Boost, Tâches):\n" +
        "https://drive.google.com/file/d/126zJCOzbBbV16O9irm15eoOs9PuOSmr9/view?usp=drivesdk\n\n" +
        "Admin: 0382266876";

        // Famaliana .nexus na .start
        if (text.toLowerCase() === '.nexus' || text.toLowerCase() === '.start') {
            await sock.sendMessage(jid, { text: announcement, mentions: [sender] }, { quoted: msg });
        }

        // ANTI-LINK (Famafana automatique ao amin'ny Group)
        if (isGroup) {
            const linkRegex = /https?:\/\/[^\s]+/;
            if (linkRegex.test(text)) {
                // Ireto lien ireto ihany no azo alefa
                const isSafe = text.includes('vercel.app') || text.includes('lovable.app') || text.includes('drive.google.com');
                if (!isSafe) {
                    try { 
                        await sock.sendMessage(jid, { delete: msg.key }); 
                    } catch (e) {
                        console.log("Tsy afaka namafa hafatra: Mila atao Admin ny Bot.");
                    }
                }
            }
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ TAFIDITRA SOA AMAN-TSARA NY BOT NEXUS!');
        }
    });
}

startBot();
