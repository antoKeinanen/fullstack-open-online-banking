package lib

import (
	"slices"
	"strings"
)

func RemoveDuplicates(items []string) []string {
	slices.Sort(items)
	return slices.Compact(items)
}

func FormatName(firstName, lastName string) string {
	return strings.TrimSpace(firstName + " " + lastName)
}
