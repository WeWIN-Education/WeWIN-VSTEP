import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/hanbee/public/templates";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Vocabulary");
const guide = workbook.worksheets.add("Huong_dan");
sheet.showGridLines = false;
guide.showGridLines = false;

const headers = [[
  "collection_code", "collection_name", "topic_code", "topic_name", "entry_code", "level", "term", "part_of_speech", "ipa", "meaning_vi", "example_en", "example_vi", "audio_url", "note",
]];
const sampleRows = [
  ["A1_A2", "Từ vựng A1–A2", "CLASSROOM", "Classroom English", "A1_A2-CLASSROOM-001", "A1-A2", "open your books", "phrase", "/ˈəʊpən jɔː bʊks/", "mở sách", "Please open your books to page ten.", "Các em mở sách đến trang mười nhé.", "", "Câu lệnh lớp học"],
  ["B1", "Từ vựng B1", "EDUCATION", "Education", "B1-EDUCATION-001", "B1", "achieve", "v", "/əˈtʃiːv/", "đạt được", "Students can achieve their goals with practice.", "Học sinh có thể đạt mục tiêu bằng luyện tập.", "", ""],
];
sheet.getRange("A1:N3").values = [...headers, ...sampleRows];
sheet.getRange("A1:N1").format = { fill: "#004AAD", font: { bold: true, color: "#FFFFFF", name: "Arial", size: 10 }, wrapText: true, horizontalAlignment: "center", verticalAlignment: "center" };
sheet.getRange("A2:N3").format = { font: { name: "Arial", size: 10, color: "#1F2937" }, wrapText: true, verticalAlignment: "center" };
sheet.getRange("A1:N3").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
sheet.getRange("F2:F1000").dataValidation = { rule: { type: "list", values: ["A1", "A2", "A1-A2", "B1", "B2", "C1", "C2"] } };
sheet.getRange("A1:N1").format.rowHeight = 32;
sheet.getRange("A1:N3").format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 18;
sheet.getRange("B:B").format.columnWidth = 24;
sheet.getRange("C:C").format.columnWidth = 18;
sheet.getRange("D:D").format.columnWidth = 24;
sheet.getRange("E:E").format.columnWidth = 30;
sheet.getRange("F:F").format.columnWidth = 12;
sheet.getRange("G:G").format.columnWidth = 25;
sheet.getRange("H:H").format.columnWidth = 18;
sheet.getRange("I:I").format.columnWidth = 22;
sheet.getRange("J:J").format.columnWidth = 28;
sheet.getRange("K:N").format.columnWidth = 34;
sheet.freezePanes.freezeRows(1);
sheet.tables.add("A1:N3", true, "VocabularyImportTemplate");

guide.getRange("A1:B10").values = [
  ["WEWIN EDUCATION · HƯỚNG DẪN NHẬP TỪ VỰNG", ""],
  ["Mục đích", "Dùng sheet Vocabulary để nhập hoặc cập nhật kho từ vựng chung."],
  ["Cột bắt buộc", "collection_code, collection_name, topic_code, topic_name, entry_code, level, term, meaning_vi"],
  ["Mã mục từ", "Giữ ổn định giữa các lần nhập. Nhập lại cùng collection_code + entry_code sẽ cập nhật mục cũ."],
  ["Cấp độ", "Chỉ dùng A1, A2, A1-A2, B1, B2, C1 hoặc C2."],
  ["Chủ đề", "Mỗi chủ đề dùng một topic_code ổn định. topic_name có thể hiển thị tiếng Việt hoặc tiếng Anh."],
  ["Cột không bắt buộc", "part_of_speech, ipa, example_en, example_vi, audio_url, note."],
  ["Giới hạn", "File .xlsx tối đa 10MB; hệ thống bỏ qua sheet Huong_dan và các dòng trống."],
  ["Kiểm tra", "Hệ thống báo trước các dòng thiếu từ/nghĩa hoặc trùng mã trong cùng file."],
  ["Lưu ý", "Không xóa tiến độ người học khi cập nhật nội dung. Dùng entry_code để tránh tạo bản sao."],
];
guide.mergeCells("A1:B1");
guide.getRange("A1:B1").format = { fill: "#004AAD", font: { bold: true, color: "#FFFFFF", name: "Arial", size: 13 }, verticalAlignment: "center" };
guide.getRange("A2:A10").format = { fill: "#E8F0FC", font: { bold: true, color: "#003A8C", name: "Arial", size: 10 }, verticalAlignment: "center" };
guide.getRange("B2:B10").format = { font: { name: "Arial", size: 10, color: "#1F2937" }, wrapText: true, verticalAlignment: "center" };
guide.getRange("A1:B10").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
guide.getRange("A:A").format.columnWidth = 22;
guide.getRange("B:B").format.columnWidth = 88;
guide.getRange("A1:B1").format.rowHeight = 28;
guide.getRange("A2:B10").format.rowHeight = 30;

workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Vocabulary!A1:N3", include: "values", tableMaxRows: 3, tableMaxCols: 14 });
console.log(check.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/WEWIN_Vocabulary_Import_Template.xlsx`);
