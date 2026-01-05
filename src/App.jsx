import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import mqtt from 'mqtt'; 
import { 
  AlertTriangle, Activity, Battery, Clock, ShieldCheck, Settings as SettingsIcon, 
  Trash2, ArrowLeft, User, Send, HelpCircle, X, CheckCircle, Heart, Edit3
} from 'lucide-react';

const AD_USER = import.meta.env.VITE_ADAFRUIT_USER; 
const AD_KEY = import.meta.env.VITE_ADAFRUIT_KEY;
const AD_FEED_FALL = 'fall-alerts';
const AD_FEED_MEDS = 'med-alerts';

const Toast = ({ message, onClose }) => (
  <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
      <CheckCircle className="text-green-400" size={20} />
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><X size={16}/></button>
    </div>
  </div>
);

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400"><X size={24} /></button>
        <h3 className="text-2xl font-black text-slate-800 mb-6">Telegram Guide</h3>
        <div className="space-y-4 text-sm font-medium text-slate-600">
          <p>1. Find <b>@userinfobot</b>, to get your ID.</p>
          <p>2. Write to <b>@elderly_carebot</b> and press START.</p>
          <p>3. Paste the ID in your profile and save.</p>
        </div>
      </div>
    </div>
  );
};

const Auth = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ user: '', pass: '' });
  const navigate = useNavigate();

  const handleAuth = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('hub_users') || '[]');
    
    let targetUser;
    if (isLogin) {
      targetUser = users.find(u => u.name === form.user && u.pass === form.pass);
    } else {
      targetUser = { name: form.user, pass: form.pass, telegramId: '', patientName: '', isNew: true };
      localStorage.setItem('hub_users', JSON.stringify([...users, targetUser]));
    }

    if (targetUser) {
      const savedEvents = JSON.parse(localStorage.getItem(`events_${targetUser.name}`)) || [];
      const savedMeds = JSON.parse(localStorage.getItem(`meds_${targetUser.name}`)) || [];

      setUser(targetUser);
      localStorage.setItem('hub_current_user', JSON.stringify(targetUser));
      navigate('/');
    } else {
      alert("Wrong username or password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl text-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <img src="/favicon.png" alt="Logo" className="w-14 h-14 object-contain" />
          <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-800">
            CARE_HUB
          </h2>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="text" placeholder="Username" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 font-bold outline-none" onChange={e => setForm({...form, user: e.target.value})} required />
          <input type="password" placeholder="Password" className="w-full bg-slate-50 border rounded-2xl px-6 py-4 font-bold outline-none" onChange={e => setForm({...form, pass: e.target.value})} required />
          <button className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="mt-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
          {isLogin ? "New user? Sign up" : "Have account? Login"}
        </button>
      </div>
    </div>
  );
};

const Dashboard = ({ user, setUser, isFall, stopFall, events, setEvents, reminders, triggerFall }) => {
  const steps = [
    { 
      target: '.step-status', 
      content: 'This is the main system status. It shows whether the patient is OK or if a fall has been detected.', 
      placement: 'bottom' 
    },
    { 
      target: '.step-simulate', 
      content: 'Use this button to simulate a fall. It tests Telegram alerts and sends data to Adafruit IO.', 
      placement: 'top' 
    },
    { 
      target: '.step-hub-status', 
      content: 'Monitor connection statuses here: GSM call activity and Telegram bot linking.', 
      placement: 'left' 
    },
    { 
      target: '.step-meds', 
      content: 'Your medication schedule. The system triggers a signal when it is time to take medicine.', 
      placement: 'left' 
    },
    { 
      target: '.step-settings', 
      content: 'Click here to manage your medication list: add new reminders or delete old ones.', 
      placement: 'bottom' 
    },
    { 
      target: '.step-profile', 
      content: 'In your profile, you must set the Patient Name and Telegram ID to receive emergency alerts.', 
      placement: 'bottom' 
    },
    { 
      target: '.step-logs', 
      content: 'The Activity Log keeps a history of all critical events and medication triggers.', 
      placement: 'top' 
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      const updatedUser = { ...user, isNew: false };
      setUser(updatedUser);
      localStorage.setItem('hub_current_user', JSON.stringify(updatedUser));
        
      const users = JSON.parse(localStorage.getItem('hub_users') || '[]');
      const newUsers = users.map(u => u.name === user.name ? updatedUser : u);
      localStorage.setItem('hub_users', JSON.stringify(newUsers));
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${isFall ? 'bg-red-50' : 'bg-slate-50'} p-4 md:p-8`}>
      {/* Настройки Joyride: синий стиль, крупный кружочек, кнопка End */}
      <Joyride 
        steps={steps} 
        run={user?.isNew} 
        callback={handleJoyrideCallback}
        continuous 
        showSkipButton
        locale={{ last: 'End' }} // Замена Last на End
        styles={{
          options: {
            primaryColor: '#2563eb', // Синий цвет кнопок (Blue 600)
            zIndex: 1000,
          },
          buttonNext: {
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: '900',
            textTransform: 'uppercase'
          },
          beacon: {
            transform: 'scale(2)', // Увеличиваем кружочек в 2 раза
          },
          beaconInner: {
            backgroundColor: '#2563eb', // Синий цвет кружочка
          },
          beaconOuter: {
            borderColor: '#2563eb', // Синий цвет пульсации
            borderWidth: '3px'
          }
        }}
      />
      
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Care Hub Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-2xl font-black text-slate-800 italic tracking-tighter uppercase">
            CARE_HUB
          </h1>
        </div>

        <div className="flex gap-3">
          <Link to="/profile" className="step-profile flex items-center gap-2 bg-white border px-5 py-2.5 rounded-full text-slate-700 font-black text-[10px] uppercase shadow-sm">
            <User size={14} /> {user?.name}
          </Link>
          <button onClick={() => {setEvents([]); localStorage.removeItem(`events_${user?.name}`)}} className="text-[10px] bg-white border border-red-200 px-4 py-2 rounded-full text-red-500 font-black uppercase">
            Clear Logs
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Status */}
        <div className={`step-status md:col-span-1 p-10 rounded-[3.5rem] shadow-2xl border-b-8 transition-all ${isFall ? 'bg-red-600 border-red-900 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
          <div className="flex justify-between items-start mb-10">
             <div className={`p-4 rounded-3xl ${isFall ? 'bg-red-500 shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
                {isFall ? <AlertTriangle size={32} /> : <ShieldCheck size={32} />}
             </div>
             <div className="text-right font-black text-[10px] uppercase opacity-60">
                <p>Monitoring:</p>
                <p className="text-xs">{user?.patientName || user?.name || "Patient"}</p>
             </div>
          </div>
          <h2 className="text-4xl font-black mb-12 tracking-tight">{isFall ? 'FALL DETECTED!' : 'STATUS: OK'}</h2>
          <button onClick={() => isFall ? stopFall() : triggerFall()} className="step-simulate w-full py-6 rounded-[2.5rem] font-black shadow-xl uppercase text-sm tracking-widest bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all">
            {isFall ? 'STOP SIMULATION' : 'SIMULATE FALL'}
          </button>
        </div>

        {/* Hub Status */}
        <div className="step-hub-status md:col-span-1 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">Hub Status</h3>
          <ul className="space-y-6 mb-12">
            <li className="flex items-center gap-3 font-bold text-sm">
              <div className={`w-2 h-2 rounded-full ${isFall ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`}></div> GSM Call: {isFall ? 'Active' : 'Idle'}
            </li>
            <li className="flex items-center gap-3 font-bold text-sm">
              <div className={`w-2 h-2 rounded-full ${user?.telegramId ? 'bg-green-500' : 'bg-slate-700'}`}></div> Telegram: {user?.telegramId ? 'Linked' : 'Not Linked'}
            </li>
          </ul>
          {/* <button className="w-full py-5 rounded-2xl bg-blue-600 font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg">
            <Heart size={16} /> Emergency Link
          </button> */}
          <p className="mt-4 text-[9px] text-slate-500 font-bold text-center uppercase leading-tight px-4 opacity-50">
              System ready for emergency communication and monitoring
          </p>
        </div>

        {/* Meds Section */}
        <div className="step-meds md:col-span-1 bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Clock size={16} /> Next Meds</h3>
            <Link to="/settings" className="step-settings p-2 bg-slate-50 rounded-full text-slate-400 hover:text-blue-600"><SettingsIcon size={18} /></Link>
          </div>
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {reminders.length > 0 ? reminders.map((r, i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center font-black">
                <div><span className="text-xl block leading-none mb-1">{r.time}</span><span className="text-[9px] text-slate-400 uppercase tracking-widest">{r.desc}</span></div>
                <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[8px] uppercase">Active</div>
              </div>
            )) : <div className="text-center py-10 opacity-20 font-black text-xs uppercase">No meds</div>}
          </div>
        </div>

        {/* Activity Log */}
        <div className="step-logs md:col-span-3 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">Activity Log</div>
          <div className="p-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Time</th><th className="px-6 py-4">Event</th><th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {events.map(ev => (
                  <tr key={ev.id} className="text-sm">
                    <td className="px-6 py-5 text-slate-400 font-mono text-xs">{ev.time}</td>
                    <td className="px-6 py-5 text-slate-700">{ev.msg}</td>
                    <td className="px-6 py-5"><span className="text-red-600 text-[10px] uppercase font-black">Critical</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const Settings = ({ reminders, setReminders, user }) => {
  const [newTime, setNewTime] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const addMed = () => {
    if (newTime && newDesc) {
      const updated = [...reminders, { time: newTime, desc: newDesc }].sort((a,b) => a.time.localeCompare(b.time));
      setReminders(updated);
      localStorage.setItem(`meds_${user.name}`, JSON.stringify(updated));
      setNewTime(''); setNewDesc('');
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 mb-8 font-bold text-sm"><ArrowLeft size={18} /> Back</Link>
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
          <h2 className="text-3xl font-black mb-8 italic">Meds Schedule</h2>
          <div className="space-y-4 mb-10 p-6 bg-slate-50 rounded-[2.5rem]">
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-white border rounded-xl px-6 py-3 font-bold" />
            <input type="text" placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-white border rounded-xl px-6 py-3 font-bold" />
            <button onClick={addMed} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-xs">Save Reminder</button>
          </div>
          {reminders.map((r, i) => (
            <div key={i} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-2xl mb-3 font-black">
              <div><p className="text-lg">{r.time}</p><p className="text-xs text-slate-400 uppercase">{r.desc}</p></div>
              <button onClick={() => {
                const filtered = reminders.filter((_, idx) => idx !== i);
                setReminders(filtered);
                localStorage.setItem(`meds_${user.name}`, JSON.stringify(filtered));
              }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Profile = ({ user, setUser, onShowToast }) => {
  const [patientName, setPatientName] = useState(user?.patientName || '');
  const [telegramId, setTelegramId] = useState(user?.telegramId || '');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();

  const handleSave = () => {
    const users = JSON.parse(localStorage.getItem('hub_users') || '[]');
    const updatedUser = { ...user, patientName, telegramId };
    localStorage.setItem('hub_current_user', JSON.stringify(updatedUser));
    localStorage.setItem('hub_users', JSON.stringify(users.map(u => u.name === user.name ? updatedUser : u)));
    setUser(updatedUser);
    onShowToast("Profile Updated!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-center">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-slate-500 mb-8 font-bold text-sm"><ArrowLeft size={18} /> Back</button>
        <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><User size={40} /></div>
          <h2 className="text-3xl font-black text-slate-800 mb-10 tracking-tight">{user?.name}</h2>
          <div className="space-y-6 text-left mb-10">
            <div className="p-6 bg-slate-50 rounded-[2rem] border">
              <label className="block font-black text-[10px] uppercase text-slate-400 mb-3 flex items-center gap-2"><Edit3 size={14}/> Patient Name</label>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 font-bold" />
            </div>
            <div className="p-6 bg-slate-50 rounded-[2rem] border">
              <div className="flex justify-between items-center mb-3">
                <label className="font-black text-[10px] uppercase text-slate-400 flex items-center gap-2"><Send size={14}/> Telegram ID</label>
                <button onClick={() => setIsHelpOpen(true)} className="text-blue-500"><HelpCircle size={18} /></button>
              </div>
              <input type="text" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 font-bold" />
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase shadow-lg">Save Changes</button>
          </div>
          <button onClick={() => { localStorage.removeItem('hub_current_user'); setUser(null); navigate('/auth'); }} className="w-full py-4 text-slate-400 font-black text-xs uppercase hover:text-red-500">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hub_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isFall, setIsFall] = useState(false);
  const [toast, setToast] = useState('');

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('hub_current_user');
    if (saved) {
      const name = JSON.parse(saved).name;
      return JSON.parse(localStorage.getItem(`events_${name}`)) || [];
    }
    return [];
  });

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('hub_current_user');
    if (saved) {
      const name = JSON.parse(saved).name;
      return JSON.parse(localStorage.getItem(`meds_${name}`)) || [];
    }
    return [];
  });

  const sendToAdafruit = (feed, val) => {
    console.log(`[MQTT Debug] Trying to send ${val} to feed: ${feed}`);
    console.log(`[MQTT Debug] Using user: ${AD_USER}`);
    
    if (!AD_USER || !AD_KEY) {
      console.error("[MQTT Error] ERROR: System not configured!");
      return;
    }

    const client = mqtt.connect(`wss://io.adafruit.com:443`, {
      username: AD_USER,
      password: AD_KEY,
      reconnectPeriod: 1000,
    });

    client.on('connect', () => {
      console.log(`[MQTT Debug] ✅ Connected to Adafruit IO successfully!`);
      const topic = `${AD_USER}/feeds/${feed}`;
      
      client.publish(topic, val.toString(), { qos: 0 }, (err) => {
        if (err) {
          console.error(`[MQTT Error] ❌ Error while publishing:`, err);
        } else {
          console.log(`[MQTT Debug] 🚀 Value [${val}] successfully sent to topic: ${topic}`);
        }
        setTimeout(() => {
          client.end();
          console.log(`[MQTT Debug] Connection closed.`);
        }, 2000);
      });
    });

    client.on('error', (err) => {
      console.error(`[MQTT Error] ❌ Critical connection error:`, err);
      client.end();
    });
  };

  const lastTriggeredTime = React.useRef("");

  useEffect(() => {
    const medTimer = setInterval(() => {
      const now = new Date().toLocaleTimeString('en-GB').slice(0, 5);
      
      if (lastTriggeredTime.current === now) return;

      const dueMed = reminders.find(r => r.time === now);
      
      if (dueMed) {
        lastTriggeredTime.current = now;
        console.log(`[Meds Timer] Время пить: ${dueMed.desc}`);
        
        sendToAdafruit(AD_FEED_MEDS, '1');
        
        const newEvent = { 
          id: Date.now(), 
          time: now, 
          msg: `MEDICATION TIME: ${dueMed.desc}` 
        };
        
        setEvents(prev => {
          const updated = [newEvent, ...prev];
          if (user) localStorage.setItem(`events_${user.name}`, JSON.stringify(updated));
          return updated;
        });

        setTimeout(() => {
          sendToAdafruit(AD_FEED_MEDS, '0');
        }, 30000);
      }
    }, 10000);

    return () => clearInterval(medTimer);
  }, [reminders, user?.name]);

  const triggerFall = () => {
    if (!user) {
      console.warn("[System] TriggerFall called but no user logged in.");
      return;
    }
    setIsFall(true);
    
    sendToAdafruit(AD_FEED_FALL, '1');
    
    const timeStr = new Date().toLocaleTimeString('en-GB').slice(0, 5);
    const targetName = user.patientName || user.name || "Patient";
    
    const newEvent = { id: Date.now(), time: timeStr, msg: `IMPACT DETECTED: ${targetName}` };
    setEvents(prev => {
      const updated = [newEvent, ...prev];
      localStorage.setItem(`events_${user.name}`, JSON.stringify(updated));
      return updated;
    });
    
    if (user.telegramId) {
      console.log(`[Telegram] Sending message to ID: ${user.telegramId}`);
      fetch(`https://api.telegram.org/bot${import.meta.env.VITE_TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${user.telegramId}&text=🚨 EMERGENCY: Fall detected for ${targetName}!`)
        .then(res => console.log("[Telegram] Response status:", res.status))
        .catch(err => console.error("[Telegram] Error:", err));
    } else {
      console.warn("[Telegram] ID not configured in profile, message not sent.");
    }
  };

  const stopFall = () => { setIsFall(false); sendToAdafruit(AD_FEED_FALL, '0'); };

  return (
    <Router>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <Routes>
        <Route path="/auth" element={<Auth setUser={setUser} />} />
        <Route path="/" element={user ? <Dashboard user={user} setUser={setUser} isFall={isFall} stopFall={stopFall} events={events} setEvents={setEvents} reminders={reminders} triggerFall={triggerFall} /> : <Navigate to="/auth" />} />
        <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} onShowToast={setToast} /> : <Navigate to="/auth" />} />
        <Route path="/settings" element={user ? <Settings reminders={reminders} setReminders={setReminders} user={user} /> : <Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}