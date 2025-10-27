import { useState } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import AvatarScene from "./AvatarScene";   // ✅ Avatar added
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [speaking, setSpeaking] = useState(false); // ✅ avatar mouth control
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const api = axios.create({
    baseURL: "https://grocery-ai-backend.onrender.com/api",
  });

  // 🎤 Speech-to-Text
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  // 🗣 Tamil speech output (prevent overlap)
  const speakTamil = (text: string) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "ta-IN";
    setSpeaking(true);
    speech.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(speech);
  };

  // 🔎 Preview video handlers
  const handlePreview = (item) => {
    setPreviewItem(item);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setTimeout(() => setPreviewItem(null), 300);
  };

  // 🔎 Search items
  const handleSearch = async (voiceQuery?: string) => {
    const searchTerm = voiceQuery || query;
    if (!searchTerm.trim()) return setMessage("⚠️ ஒரு பொருளின் பெயரை உள்ளிடவும்");

    try {
      const res = await api.get(`/items?q=${searchTerm}`);
      setItems(res.data);

      if (res.data.length) {
        const item = res.data[0];
        const reply = `${item["Item Name"]} விலை ₹${item["Price (₹)"]} ரூபாய்`;
        setMessage(reply);
        speakTamil(reply);
      } else {
        setMessage("❌ பொருள் கிடைக்கவில்லை");
        speakTamil("பொருள் கிடைக்கவில்லை");
      }
    } catch {
      setMessage("⚠️ சர்வருடன் இணைக்க முடியவில்லை");
      speakTamil("சர்வருடன் இணைக்க முடியவில்லை");
    }
  };

  // ➕ Add to Cart
  const handleAddToCart = (item: any) => {
    setCart((prev) => {
      const exist = prev.find((p) => p["Item Name"] === item["Item Name"]);
      return exist
        ? prev.map((p) =>
            p["Item Name"] === item["Item Name"]
              ? { ...p, qty: (p.qty || 1) + 1 }
              : p
          )
        : [...prev, { ...item, qty: 1 }];
    });

    const msg = `${item["Item Name"]} கூடையில் சேர்க்கப்பட்டது`;
    setMessage(msg);
    speakTamil(msg);
  };

  // 🔄 Update Qty
  const handleUpdateQty = (idx: number, change: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, qty: Math.max(1, (item.qty || 1) + change) } : item
      )
    );
  };

  // 🗑 Remove
  const handleRemoveFromCart = (i: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== i));
    speakTamil("பொருள் கூடையில் இருந்து அகற்றப்பட்டது");
  };

  // 💰 Total
  const getTotal = () =>
    cart.reduce((sum, i) => sum + (i["Price (₹)"] || 0) * (i.qty || 1), 0);

  // 🛒 Place Order
  const handleOrder = async () => {
    if (!cart.length) {
      speakTamil("⚠️ கூடை காலியாக உள்ளது");
      return setMessage("⚠️ கூடை காலியாக உள்ளது");
    }
    if (!customer || !phone || !address) {
      speakTamil("⚠️ வாடிக்கையாளர் விவரங்களை உள்ளிடவும்");
      return setMessage("⚠️ வாடிக்கையாளர் விவரங்களை உள்ளிடவும்");
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      speakTamil("⚠️ செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண் கொடுக்கவும்");
      return setMessage("⚠️ செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண் கொடுக்கவும்");
    }

    const formattedPhone = `+91${phone}`;

    try {
      const res = await api.post("/order", {
        items: cart.map((i) => ({
          item: i["Item Name"],
          quantity: i.qty,
          price: i["Price (₹)"],
        })),
        customer,
        phone: formattedPhone,
        address,
        total: getTotal(),
      });

      const msg = `✅ ஆர்டர் வெற்றிகரமாக வைக்கப்பட்டது | மொத்தம் ₹${res.data.total}`;
      setMessage(msg);
      speakTamil(msg);

      // reset
      setCart([]);
      setCustomer("");
      setPhone("");
      setAddress("");
    } catch {
      setMessage("⚠️ ஆர்டர் தோல்வியடைந்தது");
      speakTamil("ஆர்டர் தோல்வியடைந்தது");
    }
  };

  // 🎤 Mic control
  const handleMic = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript) {
        handleSearch(transcript);
        resetTranscript();
      }
    } else {
      SpeechRecognition.startListening({
        continuous: false,
        language: "ta-IN", // ✅ Tamil speech
      });
    }
  };

  // 🎨 Button style
  const btnStyle = (bg: string) => ({
    padding: "6px 12px",
    margin: "2px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: bg,
    color: "white",
    cursor: "pointer",
  });

  return (
    <div className="App">
      <header className="App-header">
        <h1>🛒 Grocery AI Assistant</h1>
        <p>பொருட்களை தேடவும், வண்டியில் சேர்க்கவும், ஆர்டர் செய்யவும்</p>

        {/* 🤖 Avatar */}
        <AvatarScene speaking={speaking} />

        {/* 🔍 Search + Mic */}
        <div style={{ marginTop: 20 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="பொருள் பெயர் (எ.கா., ஆப்பிள்)..."
            style={{
              padding: "10px",
              width: "250px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />
          <button onClick={() => handleSearch()} style={btnStyle("#4CAF50")}>
            தேடு
          </button>
          <button onClick={handleMic} style={btnStyle("#FF5722")}>
            {listening ? "🛑 நிறுத்து" : "🎤 பேசவும்"}
          </button>
        </div>

        {/* 📦 Results */}
        {items.length > 0 && (
          <div style={{ marginTop: 30, textAlign: "left" }}>
            <h3>முடிவுகள்:</h3>
            <ul>
              {items.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    marginBottom: 12,
                    border: "1px solid #ddd",
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  <b>{item["Item Name"]}</b> ({item.Category}) - ₹
                  {item["Price (₹)"]}
                  <br />
                  <small>{item.Description}</small>
                  <br />
                  <button
                    onClick={() => handleAddToCart(item)}
                    style={btnStyle("#FF9800")}
                  >
                    ➕ வண்டியில் சேர்
                  </button>
                  <button
                    onClick={() => handlePreview(item)}
                    style={Object.assign({}, btnStyle("#2196F3"), { marginLeft: 8 })}
                  >
                    ▶️ பார்வை
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 🛒 Cart */}
        {cart.length > 0 && (
          <div style={{ marginTop: 30, textAlign: "left" }}>
            <h3>🛒 உங்களின் கூடை</h3>
            <ul>
              {cart.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    marginBottom: 10,
                    border: "1px solid #ccc",
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  {item["Item Name"]} - ₹{item["Price (₹)"]} × {item.qty}
                  <br />
                  <button
                    onClick={() => handleUpdateQty(idx, -1)}
                    style={btnStyle("#9C27B0")}
                  >
                    ➖
                  </button>
                  <button
                    onClick={() => handleUpdateQty(idx, 1)}
                    style={btnStyle("#009688")}
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => handleRemoveFromCart(idx)}
                    style={btnStyle("red")}
                  >
                    ❌ நீக்கு
                  </button>
                </li>
              ))}
            </ul>
            <h4>மொத்தம்: ₹{getTotal()}</h4>

            {/* 🧑 Customer Details */}
            <div style={{ marginBottom: 15 }}>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="👤 உங்கள் பெயர்"
                style={{ padding: "8px", width: "250px", margin: "4px" }}
              />
              <br />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="📞 10 இலக்க எண்"
                maxLength={10}
                style={{ padding: "8px", width: "250px", margin: "4px" }}
              />
              <br />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="📍 விநியோக முகவரி"
                style={{ padding: "8px", width: "250px", margin: "4px" }}
              />
            </div>

            <button onClick={handleOrder} style={btnStyle("#2196F3")}>
              ✅ ஆர்டர் செய்யவும்
            </button>
          </div>
        )}

        {/* 📢 Status */}
        {message && <h4 style={{ marginTop: 20 }}>{message}</h4>}
      </header>
    </div>
  );
}


  // Preview Modal JSX
  const PreviewModal = () => {
    if (!showPreview || !previewItem) return null;
    return (
      <div style={{
        position: 'fixed', top:0, left:0, right:0, bottom:0, display:'flex',
        alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.6)',
        zIndex: 9999,
      }}>
        <div style={{ position:'relative', width: '80%', maxWidth: 720, borderRadius: 8, overflow: 'hidden', background:'#000' }}>
          <button onClick={closePreview} style={{ position:'absolute', top:8, right:8, zIndex:10000, background:'#fff', border:'none', borderRadius:4, padding:'6px 8px' }}>Close</button>
          <video
            src="/videos/small-video.mp4"
            style={{ width:'100%', height: '100%', objectFit: 'cover', display:'block' }}
            autoPlay
            muted
            controls
            playsInline
            loop
          />
          <div style={{ padding: 12, color:'#fff', background:'#111' }}>
            <b style={{ fontSize: 18 }}>{previewItem['Item Name']}</b>
            <div>₹{previewItem['Price (₹)']}</div>
            <div style={{ marginTop:6 }}>{previewItem.Description}</div>
          </div>
        </div>
      </div>
    );
  };

export default App;
