# CallPilot 📞✈️
## AI-Driven Autonomous Appointment Scheduling

CallPilot is an advanced, autonomous AI voice agent platform designed to revolutionize how businesses handle appointment scheduling. By leveraging state-of-the-art Generative AI, Real-time Voice Synthesis, and Tool-Use capabilities, CallPilot interacts with customers naturally, finds verified providers, and books appointments without human interaction.

![CallPilot Dashboard](backend/cover%20image.png)

---

## 🚀 Unique Key Features

*   **🗣️ Real-Time Conversational AI**: Powered by **ElevenLabs** and **OpenAI (via Groq/GPT-4o)** for ultra-low latency, human-like voice interactions.
*   **🧠 Autonomous Tool Use**: The AI doesn't just talk; it *acts*. It can search for providers, check calendars, calculate distances, and confirm bookings in real-time.
*   **📍 Intelligent Provider Search**: Integrated with **Google Places API** to find and vet service providers based on location, rating, and availability..
*   **📅 Dynamic Calendar Management**: Seamlessly syncs with **Google Calendar** to prevent double-booking and manage schedules efficiently.
*   **📊 Live Campaign Monitoring**: Watch conversations happen in real-time with live transcripts, sentiment analysis, and call status updates.
*   **🛡️ Smart Spam Prevention**: Built-in safeguards to prevent calling restricted numbers and handle opt-outs gracefully.

---

## 🏗️ Architecture

CallPilot employs a modern, event-driven architecture separating the frontend client, the backend orchestrator, and external AI services.

### System Architecture

```mermaid
graph TD
    subgraph Client
        UI[React + Vite Frontend]
        Store[Zustand State Store]
    end

    subgraph Server
        API[FastAPI Backend]
        DB[(Supabase PostgreSQL)]
        Socket[WebSocket Manager]
    end

    subgraph "AI Core"
        11Labs[ElevenLabs Conversational AI]
        LLM[LLM Brain (Groq/OpenAI)]
    end

    subgraph "External Tools"
        Twilio[Twilio VoIP]
        GPlaces[Google Places API]
        GCal[Google Calendar API]
    end

    UI <-->|REST / WS| API
    API <-->|Queries| DB
    API <-->|Telephony| Twilio
    Twilio <-->|Audio Stream| 11Labs
    11Labs <-->|Tool Calls| API
    API -->|Search| GPlaces
    API -->|Schedule| GCal
```

### Call Flow Logic

The following diagram illustrates how CallPilot handles an autonomous booking mission:

```mermaid
sequenceDiagram
    participant User as Human User
    participant AI as CallPilot AI
    participant Tools as Backend Tools
    participant Provider as Service Provider

    User->>AI: "Book a dentist in Boston"
    AI->>Tools: search_providers(query="dentist", location="Boston")
    Tools-->>AI: Returns list of dentists (Name, Phone, Rating)
    
    loop For each Provider
        AI->>Provider: Calls via Twilio
        Provider-->>AI: Answers Phone
        AI->>Provider: "Hello, I'd like to book an appointment..."
        
        alt Provider is Available
            Provider-->>AI: "Yes, we have 2 PM on Tuesday."
            AI->>Tools: check_calendar_availability("Tuesday 2 PM")
            
            alt Slot Free
                Tools-->>AI: "Slot Available"
                AI->>Provider: "That works. Please book it."
                AI->>Tools: create_booking_event()
                AI->>User: "Appointment Confirmed!"
                break
            else Slot Busy
                Tools-->>AI: "Slot Busy"
                AI->>Provider: "Actually, how about 4 PM?"
            end
            
        else Provider Unavailable / No Answer
            AI->>Tools: log_call_outcome("No Answer")
        end
    end
```

---

## 🛠️ Tech Stack

### Frontend
-   **Framework**: [React 19](https://react.dev/) via [Vite](https://vitejs.dev/)
-   **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Maps**: Google Maps JavaScript API

### Backend
-   **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Authentication**: JWT (JSON Web Tokens)
-   **Asynchronous**: `asyncio`, `websockets`

### AI & Infrastructure
-   **Voice AI**: [ElevenLabs Conversational AI](https://elevenlabs.io/)
-   **Telephony**: [Twilio](https://www.twilio.com/)
-   **LLM Inference**: Groq / OpenAI
-   **External APIs**: Google Places, Google Calendar

---

## 🏁 How to Use

### Prerequisites
-   Python 3.10+
-   Node.js 18+
-   PostgreSQL Database (Supabase recommended)
-   API Keys for: ElevenLabs, Twilio, OpenAI, Google Maps/Calendar.

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your API keys (details below)

# Run the server
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 3. Environment Variables
Create a `.env` file in the `backend` directory with the following:

```ini
# App
APP_ENV=development
DEBUG=true

# ElevenLabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_AGENT_ID=your_agent_id

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Google
GOOGLE_MAPS_API_KEY=your_maps_key
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Auth
JWT_SECRET=your_super_secret_jwt_key
```

### 4. Running a Campaign
1.  Log in to the dashboard.
2.  Navigate to **"Book"** to create a new campaign mission (e.g., "Find a Pizza place").
3.  The AI will start searching for providers in the specified area.
4.  Go to the **"Campaign"** page to watch the AI make calls in real-time!

---

## 📄 License
MIT License.
