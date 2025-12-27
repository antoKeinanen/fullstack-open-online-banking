package repo

import (
	tbPb "protobufs/gen/go/tigerbeetle-service"
	pb "protobufs/gen/go/user-service"
)

func TbTransferToPbTransfer(transfer *tbPb.Transfer, debitUserName, creditUserName string) *pb.Transfer {
	return &pb.Transfer{
		TransferId:         transfer.TransferId,
		Amount:             transfer.Amount,
		DebitAccountId:     transfer.DebitAccountId,
		CreditAccountId:    transfer.CreditAccountId,
		DebitUserFullName:  debitUserName,
		CreditUserFullName: creditUserName,
		Timestamp:          transfer.Timestamp,
	}
}
