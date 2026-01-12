package repo

import (
	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
)

func TbTransferToPbTransfer(transfer *tbPb.Transfer, debitUser, creditUser UserName, requestUserId string) *pb.Transfer {
	return &pb.Transfer{
		TransferId:           transfer.TransferId,
		Amount:               transfer.Amount,
		DebitAccountId:       transfer.DebitAccountId,
		CreditAccountId:      transfer.CreditAccountId,
		DebitUserFirstName:   debitUser.FirstName,
		DebitUserLastName:    debitUser.LastName,
		CreditUserFirstName:  creditUser.FirstName,
		CreditUserLastName:   creditUser.LastName,
		Timestamp:            transfer.Timestamp,
		IsIncreasingTransfer: transfer.DebitAccountId == requestUserId,
		IsSystemTransfer:     transfer.CreditAccountId == "1" || transfer.DebitAccountId == "1",
		Pending:              transfer.Pending,
		Posted:               transfer.Posted,
		Voided:               transfer.Voided,
	}
}
