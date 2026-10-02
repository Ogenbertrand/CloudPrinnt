# Documents

`DocumentAdmissionService` is the first trusted boundary after a WhatsApp download:

- accepts only `.pdf` and `.docx` filenames, then verifies their actual bytes;
- caps uploads at 15 MB and PDF page counts at 500;
- extracts PDF page metadata with `pdf-parse`, mapping protected, malformed, timed-out, and oversized work to stable error codes;
- checks DOCX ZIP central-directory metadata, encrypted entries, resource ceilings, and required OOXML parts before handing it to conversion.

DOCX page count is intentionally `null` at admission. A controlled, isolated conversion worker must produce a prepared PDF before the job becomes configurable or payable. The conversion worker must retain independent CPU, memory, and deadline controls.
