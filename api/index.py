from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
import math
import requests
from datetime import datetime

app = Flask(__name__)
# CORS ayarı: Vercel'den gelen isteklere izin ver
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/analyze')
def analyze_stock():
    symbol = request.args.get('symbol', 'THYAO').upper()
    try:
        # --- GİZLİ AJAN (USER-AGENT) AYARI ---
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        
        # Veri Çekme
        ticker_symbol = f"{symbol}.IS" if not symbol.endswith('.IS') else symbol
        ticker = yf.Ticker(ticker_symbol, session=session)
        
        hist = ticker.history(period="2y")
        info = ticker.info
        
        if hist.empty: return jsonify({"error": "Veri bulunamadı. Sembolü kontrol edin."}), 404

        # --- HAFİFLETİLMİŞ TEKNİK ANALİZ ---
        # SMA
        hist['SMA50'] = hist['Close'].rolling(window=50).mean()
        hist['SMA200'] = hist['Close'].rolling(window=200).mean()

        # RSI (Manuel Hesaplama)
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).ewm(alpha=1/14, adjust=False).mean()
        loss = (-delta.where(delta < 0, 0)).ewm(alpha=1/14, adjust=False).mean()
        rs = gain / loss
        hist['RSI'] = 100 - (100 / (1 + rs))
        
        # Grafik Verisi Hazırlama
        son_120_gun = hist.iloc[-120:].copy()
        grafik_verisi = []
        for date, row in son_120_gun.iterrows():
            grafik_verisi.append({
                "tarih": date.strftime('%Y-%m-%d'),
                "fiyat": round(row['Close'], 2),
                "sma50": round(row['SMA50'], 2) if pd.notna(row['SMA50']) else None,
                "sma200": round(row['SMA200'], 2) if pd.notna(row['SMA200']) else None
            })
        
        # Son Değerler
        son_fiyat = hist['Close'].iloc[-1]
        onceki_kapanis = hist['Close'].iloc[-2]
        yuzde_degisim = ((son_fiyat - onceki_kapanis) / onceki_kapanis) * 100
        son_rsi = hist['RSI'].iloc[-1] if pd.notna(hist['RSI'].iloc[-1]) else 50.0
        son_sma200 = hist['SMA200'].iloc[-1] if pd.notna(hist['SMA200'].iloc[-1]) else 0
        
        # Temel Veriler & Graham
        fk = info.get('trailingPE')
        pd_dd = info.get('priceToBook')
        eps = info.get('trailingEps')
        bvps = info.get('bookValue')
        
        graham_degeri = None
        graham_durum = "Nötr"
        if eps and bvps and eps > 0 and bvps > 0:
            graham_degeri = math.sqrt(22.5 * eps * bvps)
            if son_fiyat < graham_degeri: graham_durum = "İskontolu (Model Altı)"
            else: graham_durum = "Primli (Model Üstü)"

        # AI Yorum
        yorumlar = []
        if yuzde_degisim > 3: yorumlar.append(f"Momentum: Güçlü yükseliş (%{yuzde_degisim:.2f}).")
        elif yuzde_degisim < -3: yorumlar.append(f"Momentum: Sert düşüş (%{yuzde_degisim:.2f}).")
        if son_sma200 > 0:
            if son_fiyat < son_sma200: yorumlar.append("Teknik: Fiyat 200 günlüğün altında.")
            else: yorumlar.append("Teknik: Fiyat 200 günlüğün üzerinde.")
        if graham_degeri:
            if son_fiyat < graham_degeri: yorumlar.append("Temel: Graham değerine göre iskontolu.")
            else: yorumlar.append("Temel: Graham değerine göre primli.")
        
        ai_analiz_metni = " ".join(yorumlar)

        # Puanlama
        puan = 50
        if son_sma200 > 0 and son_fiyat > son_sma200: puan += 15
        else: puan -= 10
        if fk and 0 < fk < 10: puan += 15
        elif fk and fk > 25: puan -= 10
        if son_rsi < 30: puan += 20
        elif son_rsi > 70: puan -= 10
        puan = max(0, min(100, puan))
        
        simdi = datetime.now().strftime("%d.%m.%Y - %H:%M:%S")

        return jsonify({
            "symbol": symbol,
            "irket_adi": info.get('longName', symbol),
            "fiyat": f"{son_fiyat:.2f}",
            "yuzde_degisim": f"{yuzde_degisim:.2f}",
            "puan": puan,
            "analiz": {
                "rsi": f"{son_rsi:.1f}",
                "fk": f"{fk:.2f}" if fk else "N/A",
                "pd_dd": f"{pd_dd:.2f}" if pd_dd else "N/A",
                "graham": f"{graham_degeri:.2f}" if graham_degeri else "N/A",
                "graham_durum": graham_durum,
                "ai_yorum": ai_analiz_metni
            },
            "renk": "green" if puan >= 70 else "red" if puan <= 40 else "yellow",
            "grafik_data": grafik_verisi,
            "guncelleme_saati": simdi
        })
    except Exception as e:
        return jsonify({"error": f"Sunucu Hatası: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5328)
