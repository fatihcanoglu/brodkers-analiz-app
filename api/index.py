from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas_ta as ta
import pandas as pd
import math
from datetime import datetime # <-- YENİ EKLENEN KÜTÜPHANE

app = Flask(__name__)
CORS(app) 

@app.route('/api/analyze')
def analyze_stock():
    symbol = request.args.get('symbol', 'THYAO').upper()
    try:
        # Veri Çekme
        ticker_symbol = f"{symbol}.IS" if not symbol.endswith('.IS') else symbol
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="2y")
        info = ticker.info
        
        if hist.empty: return jsonify({"error": "Veri yok"}), 404

        # Teknik Hesaplamalar
        hist['SMA50'] = ta.sma(hist['Close'], length=50)
        hist['SMA200'] = ta.sma(hist['Close'], length=200)
        hist['RSI'] = ta.rsi(hist['Close'], length=14)

        son_6_ay = hist.iloc[-120:].copy()
        grafik_verisi = []
        for date, row in son_6_ay.iterrows():
            grafik_verisi.append({
                "tarih": date.strftime('%Y-%m-%d'),
                "fiyat": round(row['Close'], 2),
                "sma50": round(row['SMA50'], 2) if pd.notna(row['SMA50']) else None,
                "sma200": round(row['SMA200'], 2) if pd.notna(row['SMA200']) else None
            })
        
        # Son Değerler
        son_fiyat = hist['Close'].iloc[-1]
        son_rsi = hist['RSI'].iloc[-1] if pd.notna(hist['RSI'].iloc[-1]) else 50.0
        son_sma200 = hist['SMA200'].iloc[-1] if pd.notna(hist['SMA200'].iloc[-1]) else 0
        
        # Temel Veriler
        fk = info.get('trailingPE')
        pd_dd = info.get('priceToBook')
        eps = info.get('trailingEps')
        bvps = info.get('bookValue')
        
        # Graham Hesabı
        graham_degeri = None
        graham_durum = "Nötr"
        if eps and bvps and eps > 0 and bvps > 0:
            graham_degeri = math.sqrt(22.5 * eps * bvps)
            if son_fiyat < graham_degeri: graham_durum = "UCUZ (İskontolu)"
            else: graham_durum = "PAHALI (Primli)"

        # Yapay Zeka Yorumu
        yorumlar = []
        if son_sma200 > 0:
            if son_fiyat < son_sma200:
                yorumlar.append(f"Teknik: {symbol}, SMA200'ün altında (Ayı Piyasası).")
            else:
                yorumlar.append(f"Teknik: {symbol}, SMA200'ün üzerinde (Boğa Piyasası).")
        
        if graham_degeri:
            if son_fiyat < graham_degeri:
                yorumlar.append("Temel: Graham modeline göre İSKONTOLU.")
            else:
                yorumlar.append("Temel: Graham modeline göre PRİMLİ.")
        
        if son_rsi < 30: yorumlar.append("RSI: Aşırı satım bölgesinde (Tepki gelebilir).")
        elif son_rsi > 70: yorumlar.append("RSI: Aşırı alım bölgesinde (Dikkat).")
        
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
        
        # Zaman Damgası Oluştur
        simdi = datetime.now().strftime("%d.%m.%Y - %H:%M:%S") # <-- SAATİ ALDIK

        return jsonify({
            "symbol": symbol,
            "irket_adi": info.get('longName', symbol),
            "fiyat": f"{son_fiyat:.2f}",
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
            "guncelleme_saati": simdi # <-- FRONTEND'E GÖNDERİYORUZ
        })
    except Exception as e:
        print(f"HATA: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5328, debug=True)