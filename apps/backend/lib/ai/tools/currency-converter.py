import sys
import yfinance as yf

# Get exchange rates for both directions
from_currency = sys.argv[1]
to_currency = sys.argv[2]
period = sys.argv[3]
amount = 100

# Forward conversion (from -> to)
currency_pair_forward = f'{from_currency}{to_currency}=X'
data_forward = yf.Ticker(currency_pair_forward).history(period=period)
print(f"Forward rate: {data_forward.to_json()}")

# Reverse conversion (to -> from)
currency_pair_reverse = f'{to_currency}{from_currency}=X'
data_reverse = yf.Ticker(currency_pair_reverse).history(period=period)
print(f"Reverse rate: {data_reverse.to_json()}")

# print(f"Forward rate: {rate_forward}")
# print(f"Reverse rate: {rate_reverse}")
# print(f"Converted amount: {converted_amount}")