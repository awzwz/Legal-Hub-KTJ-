import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { motion } from "framer-motion";

const reports = [
  { id: "1", name: "Уголовные", description: "Реестр уголовных дел с детализацией", formats: ["xlsx", "pdf"] },
  { id: "2", name: "Административные", description: "Реестр административных дел с детализацией", formats: ["xlsx", "pdf"] },
  { id: "3", name: "Гражданские", description: "Реестр гражданских дел с детализацией", formats: ["xlsx", "pdf"] },
  { id: "4", name: "Исполнительные производства", description: "Дела на стадии исполнительного производства", formats: ["xlsx", "pdf"] },
  { id: "5", name: "Претензионно-исковая работа", description: "Претензии, иски, суммы требований и оплат", formats: ["xlsx", "pdf"] },
];

const ReportsPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Отчёты</h2>
        <span className="text-xs text-muted-foreground">Выгрузка в привычном формате</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{r.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </div>
            <div className="flex gap-2 mt-4">
              {r.formats.includes("xlsx") && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                  <Download className="w-3 h-3" />
                </button>
              )}
              {r.formats.includes("pdf") && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-overdue/10 text-overdue hover:bg-overdue/20 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                  <Download className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
