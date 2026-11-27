"""PS5 Pro 1TB (UK) restock checker. Sends a phone push via ntfy.sh when a page looks in stock."""
import os, re, urllib.request

NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "change-me-to-something-random")

# (shop, url, regex that means OUT of stock, regex that means IN stock)
SHOPS = [
    ("PlayStation Direct", "https://direct.playstation.com/en-gb/buy-consoles/playstation5-pro-console",
     r"out of stock|currently unavailable|sold out", r"add to (basket|cart)"),
    ("Argos", "https://www.argos.co.uk/search/ps5-pro/",
     r"out of stock|not available", r"add to trolley"),
    ("Currys", "https://www.currys.co.uk/search?q=ps5%20pro",
     r"out of stock|sold out", r"add to basket"),
    ("Smyths", "https://www.smythstoys.com/uk/en-gb/search/?text=ps5+pro",
     r"out of stock|unavailable", r"add to (basket|cart)"),
    ("GAME", "https://www.game.co.uk/en/m/search/?q=ps5+pro",
     r"out of stock|sold out", r"add to basket"),
]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-GB"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "ignore").lower()

def notify(msg, url):
    req = urllib.request.Request(f"https://ntfy.sh/{NTFY_TOPIC}", data=msg.encode(),
        headers={"Title": "PS5 Pro restock!", "Click": url, "Priority": "high"})
    urllib.request.urlopen(req, timeout=15)

for name, url, out_re, in_re in SHOPS:
    try:
        html = fetch(url)
    except Exception as e:
        print(f"{name}: fetch failed ({e})"); continue
    in_stock = re.search(in_re, html) and not re.search(out_re, html)
    print(f"{name}: {'IN STOCK' if in_stock else 'out of stock'}")
    if in_stock:
        notify(f"{name} may have PS5 Pro 1TB in stock", url)
