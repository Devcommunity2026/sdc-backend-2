import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Software Developers' Community";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Certificates_Import");

  worksheet.columns = [
    { header: "Full Name", key: "holderName", width: 28 },
    { header: "Position", key: "courseOrTitle", width: 36 },
    { header: "Start Date", key: "startDate", width: 22 },
    { header: "End Date", key: "endDate", width: 22 },
    { header: "Certificate Type", key: "certificateType", width: 26 },
    { header: "Certificate ID", key: "certificateId", width: 28 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  worksheet.addRow({
    holderName: "Aarav Sharma",
    courseOrTitle: "Full Stack Developer Intern",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    certificateType: "internship",
    certificateId: "SDC-INT-SAMPLE-01",
  });

  worksheet.addRow({
    holderName: "Priya Verma",
    courseOrTitle: "DevOps and Cloud Intern",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    certificateType: "internship",
    certificateId: "SDC-INT-SAMPLE-02",
  });

  worksheet.addRow({
    holderName: "Rohan Joshi",
    courseOrTitle: "Annual Hackathon 2026 - 1st Place",
    startDate: "2026-11-04",
    endDate: "",
    certificateType: "merit",
    certificateId: "SDC-MERIT-SAMPLE-03",
  });

  worksheet.addRow({
    holderName: "Ananya Gupta",
    courseOrTitle: "Keynote Speaker and Technical Mentor",
    startDate: "2026-11-04",
    endDate: "",
    certificateType: "appreciation",
    certificateId: "SDC-APPR-SAMPLE-04",
  });

  const outPath = path.resolve(__dirname, "../../../frontend/public/sdc_certificate_bulk_template.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log("Successfully wrote template to:", outPath);
};

generateTemplate();
