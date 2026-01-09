package lib

func RedactPhoneNumber(phoneNumber string) string {
	runes := []rune(phoneNumber)
	if len(runes) <= 4 {
		return phoneNumber
	}
	redacted := ""
	for i := 0; i < len(runes)-4; i++ {
		if runes[i] == ' ' || runes[i] == '-' || runes[i] == '+' {
			redacted += string(runes[i])
		} else {
			redacted += "*"
		}
	}
	return redacted + string(runes[len(runes)-4:])
}

func RedactJWT(jwt string) string {
	runes := []rune(jwt)
	if len(runes) <= 10 {
		return "***"
	}
	return string(runes[:5]) + "..." + string(runes[len(runes)-5:])
}
