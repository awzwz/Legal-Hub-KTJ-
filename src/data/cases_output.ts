export const mockCases: LegalCase[] = [
  {
    "id": "1",
    "caseNumber": "2-1001/2026",
    "court": "СМЭС г. Астана",
    "courtInstance": "cassation",
    "caseType": "corporate",
    "status": "active",
    "outcome": "pending",
    "partyRole": "defendant",
    "opponentType": "juridical",
    "plaintiff": "ТОО «АльфаПром»",
    "defendant": "АО «НК «КТЖ»",
    "company": "ТОО «АльфаПром»",
    "companyBIN": "836267095540",
    "claimAmount": 5145731000,
    "mainDebt": 4116584800,
    "stateFee": 154371930,
    "fines": 514573100,
    "repExpenses": 257286550,
    "otherCosts": 102914620,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Центральный аппарат",
    "city": "Астана",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d1-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c1-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e1-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "2",
    "caseNumber": "2-1002/2026",
    "court": "СМЭС г. Астана",
    "courtInstance": "appeal",
    "caseType": "corporate",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "defendant",
    "opponentType": "physical",
    "plaintiff": "Омаров С.С.",
    "defendant": "АО «НК «КТЖ»",
    "company": "Омаров С.С.",
    "companyBIN": "995464333393",
    "claimAmount": 7005347000,
    "mainDebt": 5604277600,
    "stateFee": 210160410,
    "fines": 700534700,
    "repExpenses": 350267350,
    "otherCosts": 140106940,
    "paidAmount": 1401069400,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Центральный аппарат",
    "city": "Астана",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": "2026-08-01",
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d2-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p2-1",
        "documentNumber": "ПП-211",
        "payer": "АО «НК «КТЖ»",
        "payee": "Омаров С.С.",
        "date": "2026-03-15",
        "amount": 1401069400,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c2-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e2-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "3",
    "caseNumber": "2-1003/2026",
    "court": "СМЭС г. Астана",
    "courtInstance": "cassation",
    "caseType": "corporate",
    "status": "suspended",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "juridical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "ТОО «ТемирЖол»",
    "company": "ТОО «ТемирЖол»",
    "companyBIN": "536066144288",
    "claimAmount": 13266140000,
    "mainDebt": 10612912000,
    "stateFee": 397984200,
    "fines": 1326614000,
    "repExpenses": 663307000,
    "otherCosts": 265322800,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Центральный аппарат",
    "city": "Астана",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d3-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c3-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e3-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "4",
    "caseNumber": "2-1004/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "administrative",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "physical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "Алиев А.А.",
    "company": "Алиев А.А.",
    "companyBIN": "753503686196",
    "claimAmount": 2663000,
    "mainDebt": 2130400,
    "stateFee": 79890,
    "fines": 266300,
    "repExpenses": 133150,
    "otherCosts": 53260,
    "paidAmount": 532600,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Северный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": "2026-08-01",
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "low",
    "documents": [
      {
        "id": "d4-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p4-1",
        "documentNumber": "ПП-411",
        "payer": "Алиев А.А.",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 532600,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c4-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e4-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "5",
    "caseNumber": "2-1005/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "criminal",
    "status": "closed",
    "outcome": "settled",
    "partyRole": "plaintiff",
    "opponentType": "juridical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "ТОО «АльфаПром»",
    "company": "ТОО «АльфаПром»",
    "companyBIN": "605260039099",
    "claimAmount": 16237000,
    "mainDebt": 12989600,
    "stateFee": 487110,
    "fines": 1623700,
    "repExpenses": 811850,
    "otherCosts": 324740,
    "paidAmount": 16237000,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Экспресс",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": null,
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d5-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p5-1",
        "documentNumber": "ПП-511",
        "payer": "ТОО «АльфаПром»",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 16237000,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c5-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e5-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "6",
    "caseNumber": "2-1006/2026",
    "court": "Областной суд",
    "courtInstance": "appeal",
    "caseType": "civil",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "juridical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "КГД МФ РК",
    "company": "КГД МФ РК",
    "companyBIN": "646982949160",
    "claimAmount": 138966000,
    "mainDebt": 111172800,
    "stateFee": 4168980,
    "fines": 13896600,
    "repExpenses": 6948300,
    "otherCosts": 2779320,
    "paidAmount": 27793200,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Северный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": "2026-08-01",
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "medium",
    "documents": [
      {
        "id": "d6-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p6-1",
        "documentNumber": "ПП-611",
        "payer": "КГД МФ РК",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 27793200,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c6-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e6-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "7",
    "caseNumber": "2-1007/2026",
    "court": "Областной суд",
    "courtInstance": "cassation",
    "caseType": "administrative",
    "status": "mediation",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "juridical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "ТОО «ТемирЖол»",
    "company": "ТОО «ТемирЖол»",
    "companyBIN": "528267140570",
    "claimAmount": 148876000,
    "mainDebt": 119100800,
    "stateFee": 4466280,
    "fines": 14887600,
    "repExpenses": 7443800,
    "otherCosts": 2977520,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Экспресс",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d7-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c7-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e7-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "8",
    "caseNumber": "2-1008/2026",
    "court": "Областной суд",
    "courtInstance": "cassation",
    "caseType": "civil",
    "status": "active",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "physical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "Иванов И.И.",
    "company": "Иванов И.И.",
    "companyBIN": "911616050056",
    "claimAmount": 93386000,
    "mainDebt": 74708800,
    "stateFee": 2801580,
    "fines": 9338600,
    "repExpenses": 4669300,
    "otherCosts": 1867720,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d8-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c8-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e8-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "9",
    "caseNumber": "2-1009/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "corporate",
    "status": "closed",
    "outcome": "denied",
    "partyRole": "defendant",
    "opponentType": "juridical",
    "plaintiff": "АО «Самрук»",
    "defendant": "АО «НК «КТЖ»",
    "company": "АО «Самрук»",
    "companyBIN": "900318498454",
    "claimAmount": 499783000,
    "mainDebt": 399826400,
    "stateFee": 14993490,
    "fines": 49978300,
    "repExpenses": 24989150,
    "otherCosts": 9995660,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Экспресс",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": null,
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "low",
    "documents": [
      {
        "id": "d9-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c9-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e9-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "10",
    "caseNumber": "2-1010/2026",
    "court": "Областной суд",
    "courtInstance": "supreme",
    "caseType": "administrative",
    "status": "active",
    "outcome": "pending",
    "partyRole": "defendant",
    "opponentType": "physical",
    "plaintiff": "Сыздыков Б.М.",
    "defendant": "АО «НК «КТЖ»",
    "company": "Сыздыков Б.М.",
    "companyBIN": "896500229926",
    "claimAmount": 442067000,
    "mainDebt": 353653600,
    "stateFee": 13262010,
    "fines": 44206700,
    "repExpenses": 22103350,
    "otherCosts": 8841340,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "low",
    "documents": [
      {
        "id": "d10-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c10-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e10-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "11",
    "caseNumber": "2-1011/2026",
    "court": "Областной суд",
    "courtInstance": "cassation",
    "caseType": "labor",
    "status": "active",
    "outcome": "pending",
    "partyRole": "defendant",
    "opponentType": "physical",
    "plaintiff": "Алиев А.А.",
    "defendant": "АО «НК «КТЖ»",
    "company": "Алиев А.А.",
    "companyBIN": "804308422947",
    "claimAmount": 213328000,
    "mainDebt": 170662400,
    "stateFee": 6399840,
    "fines": 21332800,
    "repExpenses": 10666400,
    "otherCosts": 4266560,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "medium",
    "documents": [
      {
        "id": "d11-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c11-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e11-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "12",
    "caseNumber": "2-1012/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "criminal",
    "status": "mediation",
    "outcome": "pending",
    "partyRole": "third_party",
    "opponentType": "juridical",
    "plaintiff": "ТОО «ТемирЖол»",
    "defendant": "ТОО «ТемирЖол»",
    "company": "ТОО «ТемирЖол»",
    "companyBIN": "349016066384",
    "claimAmount": 288419000,
    "mainDebt": 230735200,
    "stateFee": 8652570,
    "fines": 28841900,
    "repExpenses": 14420950,
    "otherCosts": 5768380,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Северный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "medium",
    "documents": [
      {
        "id": "d12-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c12-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e12-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "13",
    "caseNumber": "2-1013/2026",
    "court": "Областной суд",
    "courtInstance": "supreme",
    "caseType": "executive",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "third_party",
    "opponentType": "juridical",
    "plaintiff": "ТОО «ТрансЛогистик»",
    "defendant": "ТОО «ТрансЛогистик»",
    "company": "ТОО «ТрансЛогистик»",
    "companyBIN": "589846533825",
    "claimAmount": 421250000,
    "mainDebt": 337000000,
    "stateFee": 12637500,
    "fines": 42125000,
    "repExpenses": 21062500,
    "otherCosts": 8425000,
    "paidAmount": 84250000,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": "2026-08-01",
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "low",
    "documents": [
      {
        "id": "d13-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p13-1",
        "documentNumber": "ПП-1311",
        "payer": "АО «НК «КТЖ»",
        "payee": "ТОО «ТрансЛогистик»",
        "date": "2026-03-15",
        "amount": 84250000,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c13-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e13-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "14",
    "caseNumber": "2-1014/2026",
    "court": "Областной суд",
    "courtInstance": "supreme",
    "caseType": "other",
    "status": "suspended",
    "outcome": "pending",
    "partyRole": "defendant",
    "opponentType": "juridical",
    "plaintiff": "ТОО «АльфаПром»",
    "defendant": "АО «НК «КТЖ»",
    "company": "ТОО «АльфаПром»",
    "companyBIN": "607177292974",
    "claimAmount": 380661000,
    "mainDebt": 304528800,
    "stateFee": 11419830,
    "fines": 38066100,
    "repExpenses": 19033050,
    "otherCosts": 7613220,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d14-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c14-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e14-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "15",
    "caseNumber": "2-1015/2026",
    "court": "Областной суд",
    "courtInstance": "appeal",
    "caseType": "executive",
    "status": "mediation",
    "outcome": "pending",
    "partyRole": "third_party",
    "opponentType": "juridical",
    "plaintiff": "ТОО «ТемирЖол»",
    "defendant": "ТОО «ТемирЖол»",
    "company": "ТОО «ТемирЖол»",
    "companyBIN": "865942396406",
    "claimAmount": 76013000,
    "mainDebt": 60810400,
    "stateFee": 2280390,
    "fines": 7601300,
    "repExpenses": 3800650,
    "otherCosts": 1520260,
    "paidAmount": 0,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Южный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": null,
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d15-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [],
    "comments": [
      {
        "id": "c15-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e15-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "16",
    "caseNumber": "2-1016/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "tax",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "physical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "Омаров С.С.",
    "company": "Омаров С.С.",
    "companyBIN": "429731359533",
    "claimAmount": 48870000,
    "mainDebt": 39096000,
    "stateFee": 1466100,
    "fines": 4887000,
    "repExpenses": 2443500,
    "otherCosts": 977400,
    "paidAmount": 9774000,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": "2026-08-01",
    "daysOverdue": 0,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d16-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p16-1",
        "documentNumber": "ПП-1611",
        "payer": "Омаров С.С.",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 9774000,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c16-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Рабочий процесс идет.",
        "type": "info",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e16-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "17",
    "caseNumber": "2-1017/2026",
    "court": "Областной суд",
    "courtInstance": "cassation",
    "caseType": "criminal",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "third_party",
    "opponentType": "juridical",
    "plaintiff": "АО «Самрук»",
    "defendant": "АО «Самрук»",
    "company": "АО «Самрук»",
    "companyBIN": "311438073866",
    "claimAmount": 126613000,
    "mainDebt": 101290400,
    "stateFee": 3798390,
    "fines": 12661300,
    "repExpenses": 6330650,
    "otherCosts": 2532260,
    "paidAmount": 25322600,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Западный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": "2025-11-01",
    "daysOverdue": 45,
    "lastUpdated": "2026-04-20",
    "riskLevel": "low",
    "documents": [
      {
        "id": "d17-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p17-1",
        "documentNumber": "ПП-1711",
        "payer": "АО «НК «КТЖ»",
        "payee": "АО «Самрук»",
        "date": "2026-03-15",
        "amount": 25322600,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c17-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Срочно нужно взыскать долг, сроки горят!",
        "type": "problem",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e17-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "18",
    "caseNumber": "2-1018/2026",
    "court": "Областной суд",
    "courtInstance": "supreme",
    "caseType": "tax",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "physical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "Омаров С.С.",
    "company": "Омаров С.С.",
    "companyBIN": "754096867717",
    "claimAmount": 143011000,
    "mainDebt": 114408800,
    "stateFee": 4290330,
    "fines": 14301100,
    "repExpenses": 7150550,
    "otherCosts": 2860220,
    "paidAmount": 28602200,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Экспресс",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": "2025-11-01",
    "daysOverdue": 120,
    "lastUpdated": "2026-04-20",
    "riskLevel": "medium",
    "documents": [
      {
        "id": "d18-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p18-1",
        "documentNumber": "ПП-1811",
        "payer": "Омаров С.С.",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 28602200,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c18-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Срочно нужно взыскать долг, сроки горят!",
        "type": "problem",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e18-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "19",
    "caseNumber": "2-1019/2026",
    "court": "Областной суд",
    "courtInstance": "cassation",
    "caseType": "administrative",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "third_party",
    "opponentType": "juridical",
    "plaintiff": "АО «Самрук»",
    "defendant": "АО «Самрук»",
    "company": "АО «Самрук»",
    "companyBIN": "568071871706",
    "claimAmount": 194302000,
    "mainDebt": 155441600,
    "stateFee": 5829060,
    "fines": 19430200,
    "repExpenses": 9715100,
    "otherCosts": 3886040,
    "paidAmount": 38860400,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Южный",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "not_set",
    "paymentDeadline": "2025-11-01",
    "daysOverdue": 120,
    "lastUpdated": "2026-04-20",
    "riskLevel": "medium",
    "documents": [
      {
        "id": "d19-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p19-1",
        "documentNumber": "ПП-1911",
        "payer": "АО «НК «КТЖ»",
        "payee": "АО «Самрук»",
        "date": "2026-03-15",
        "amount": 38860400,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c19-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Срочно нужно взыскать долг, сроки горят!",
        "type": "problem",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e19-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  },
  {
    "id": "20",
    "caseNumber": "2-1020/2026",
    "court": "Областной суд",
    "courtInstance": "first",
    "caseType": "executive",
    "status": "execution",
    "outcome": "pending",
    "partyRole": "plaintiff",
    "opponentType": "physical",
    "plaintiff": "АО «НК «КТЖ»",
    "defendant": "Петров П.П.",
    "company": "Петров П.П.",
    "companyBIN": "558110160192",
    "claimAmount": 439086000,
    "mainDebt": 351268800,
    "stateFee": 13172580,
    "fines": 43908600,
    "repExpenses": 21954300,
    "otherCosts": 8781720,
    "paidAmount": 87817200,
    "assignedLawyer": "Иванов А.А.",
    "branch": "Экспресс",
    "city": "Алматы",
    "judge": "Сыздыков Р.К.",
    "filingDate": "2026-01-10",
    "nextHearing": "2026-06-15 10:00",
    "paymentDeadline": "2025-11-01",
    "daysOverdue": 150,
    "lastUpdated": "2026-04-20",
    "riskLevel": "high",
    "documents": [
      {
        "id": "d20-1",
        "title": "Исковое заявление",
        "uploadDate": "2026-01-10",
        "author": "Иванов А.А."
      }
    ],
    "payments": [
      {
        "id": "p20-1",
        "documentNumber": "ПП-2011",
        "payer": "Петров П.П.",
        "payee": "АО «НК «КТЖ»",
        "date": "2026-03-15",
        "amount": 87817200,
        "description": "Оплата по делу"
      }
    ],
    "comments": [
      {
        "id": "c20-1",
        "author": "Юрист",
        "role": "branch_lawyer",
        "text": "Срочно нужно взыскать долг, сроки горят!",
        "type": "problem",
        "date": "2026-04-18",
        "likes": 1
      }
    ],
    "events": [
      {
        "id": "e20-1",
        "date": "2026-01-10",
        "action": "Регистрация иска",
        "user": "Система"
      }
    ]
  }
];