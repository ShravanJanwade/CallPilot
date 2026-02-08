import traceback

# Test exactly what main.py does
print("Testing route imports one by one...")

route_imports = [
    "from app.routes import auth",
    "from app.routes import booking", 
    "from app.routes import campaign",
    "from app.routes import dashboard",
    "from app.routes import providers",
    "from app.routes import settings as settings_routes",
    "from app.routes import ws",
    "from app.routes import tools",
]

for route in route_imports:
    try:
        exec(route)
        print(f"✅ {route}")
    except Exception as e:
        print(f"❌ {route}")
        traceback.print_exc()
        break

print("\nNow testing combined import like main.py does...")
try:
    # This is exactly how main.py imports
    from app.routes import auth, booking, campaign, dashboard, providers, settings as settings_routes, ws, tools
    print("✅ Combined import SUCCESS")
except Exception as e:
    print("❌ Combined import FAILED")
    traceback.print_exc()
