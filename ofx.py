import sys
import argparse
import datetime
from decimal import Decimal
from dataclasses import dataclass
import xml.etree.ElementTree as ET


def main():
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument('-a', '--alias', action='append', type=lambda a: a.split('=', maxsplit=1), default=[],
                            help='Account alias, renames accounts (format: name=alias)')
    arg_parser.add_argument('input', nargs='?', default=None)
    args = arg_parser.parse_args()

    aliases = {a[0]: a[1] for a in args.alias}

    if args.input:
        tree = ET.parse(args.input)
    else:
        tree = ET.parse(sys.stdin)

    root = tree.getroot()
    assert root.tag == 'OFX'
    today = datetime.date.today()

    for msg_set in root.iterfind('BANKMSGSRSV1'):
        for transaction_response in msg_set.iterfind('STMTTRNRS'):
            for statement_response in transaction_response.iterfind('STMTRS'):
                # currency = statement_response.find('CURDEF').text
                account_name = format_account_name(statement_response.find('BANKACCTFROM'))
                account_name = aliases.get(account_name, account_name)
                print(f'\n; imported statements for {account_name} @ {today}\n')
                for transaction_list in statement_response.iterfind('BANKTRANLIST'):
                    for transaction in transaction_list.iterfind('STMTTRN'):
                        t = Transaction()
                        dt_posted = transaction.find('DTPOSTED').text
                        t.date = format_date(dt_posted)
                        t.time = format_time(dt_posted)
                        t.amount = format_amount(transaction.find('TRNAMT').text)
                        t.description = transaction.find('NAME').text

                        memo = transaction.find('MEMO').text
                        trn_type = transaction.find('TRNTYPE').text.lower()
                        if trn_type == 'debit':
                            t.credit_account = account_name
                            t.debit_account = 'expenses:' + memo
                            t.amount = t.amount[1:]  # remove minus sign
                        else:
                            t.credit_account = 'income:' + memo
                            t.debit_account = account_name

                        print(t.format())


def format_account_name(bank_acct: ET.Element):
    bank_id = bank_acct.find('BANKID').text.lower()
    acct_id = bank_acct.find('ACCTID').text.lower()
    acct_type = bank_acct.find('ACCTTYPE').text.lower()
    return f'assets:{bank_id}:{acct_type}:{acct_id}'


def format_date(ofx_dt: str):
    year = ofx_dt[0:4]
    month = ofx_dt[4:6]
    day = ofx_dt[6:8]
    return f'{year}-{month}-{day}'


def format_time(ofx_dt: str):
    hour = ofx_dt[8:10]
    minute = ofx_dt[10:12]
    return f'{hour}:{minute}'


def format_amount(ofx_amount: str):
    amount = Decimal(ofx_amount)
    return f'{amount:,.2f}'


@dataclass(init=False)
class Transaction:
    credit_account: str
    debit_account: str
    date: str
    time: str
    description: str
    amount: str

    def format(self) -> str:
        line1 = f'{self.date} {self.time} {self.description}\n'
        line2 = f'    {self.credit_account}\n'
        line3 = f'    {self.debit_account:<35} {self.amount}\n'
        return line1 + line2 + line3


if __name__ == '__main__':
    main()
