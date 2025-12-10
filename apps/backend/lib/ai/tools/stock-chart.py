import sys
import yfinance as yf

symbol = sys.argv[1]
period = sys.argv[2]

nvda = yf.Ticker(symbol).history(period=period)

print(f"Historical Data: {nvda.to_json()}")