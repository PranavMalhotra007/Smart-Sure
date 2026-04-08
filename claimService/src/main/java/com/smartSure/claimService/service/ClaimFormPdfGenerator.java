package com.smartSure.claimService.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.PDPageContentStream;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

/**
 * Minimal PDF generator for the customer claim form.
 * It embeds the provided digital signature image and renders the JSON fields as text.
 */
public class ClaimFormPdfGenerator {

    public byte[] generateClaimFormPdf(
            String policyNumber,
            LocalDate dateClaimFiled,
            LocalDate dateIncidentHappen,
            String reasonForClaim,
            byte[] signatureBytes
    ) throws IOException {

        if (signatureBytes == null || signatureBytes.length == 0) {
            throw new IllegalArgumentException("Digital signature image bytes are missing.");
        }

        // Validate signature decodes as an image (gives better error than PDFBox alone).
        BufferedImage signatureImage = ImageIO.read(new java.io.ByteArrayInputStream(signatureBytes));
        if (signatureImage == null) {
            throw new IllegalArgumentException("Digital signature image is not a supported/valid image.");
        }

        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float marginX = 50;
            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();

            float maxTextWidth = pageWidth - (marginX * 2);

            // Text sizing
            float titleFontSize = 18;
            float labelFontSize = 12;
            float valueFontSize = 12;
            float lineHeight = 15;

            float y = pageHeight - 70;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                PDType1Font helveticaBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font helvetica = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

                // Title
                cs.beginText();
                cs.setFont(helveticaBold, titleFontSize);
                cs.newLineAtOffset(marginX, y);
                cs.showText("Claim Form");
                cs.endText();

                y -= 28;

                // Fields
                y = drawField(cs, helveticaBold, helvetica, labelFontSize, valueFontSize,
                        marginX, y, maxTextWidth, "Policy Number", policyNumber, lineHeight);
                y = drawField(cs, helveticaBold, helvetica, labelFontSize, valueFontSize,
                        marginX, y, maxTextWidth, "Date of Claim Filed", String.valueOf(dateClaimFiled), lineHeight);
                y = drawField(cs, helveticaBold, helvetica, labelFontSize, valueFontSize,
                        marginX, y, maxTextWidth, "Date of Incident Happened", String.valueOf(dateIncidentHappen), lineHeight);

                // Reason (multi-line)
                y -= 8;
                // label
                y = drawText(cs, helveticaBold, labelFontSize, marginX, y, "Reason for Claim");
                y -= 4;

                List<String> wrappedReason = wrapText(reasonForClaim, helvetica, valueFontSize, maxTextWidth);
                float signatureBoxTopY = 140; // y where signature label begins
                float signatureBoxBottomY = 60;
                float currentY = y;
                for (String line : wrappedReason) {
                    if (currentY <= signatureBoxBottomY + 80) break; // keep space for signature image
                    currentY = drawText(cs, helvetica, valueFontSize, marginX, currentY, line);
                    currentY -= 3;
                }

                // Signature label
                cs.setFont(helveticaBold, labelFontSize);
                cs.beginText();
                cs.newLineAtOffset(marginX, signatureBoxTopY);
                cs.showText("Digital Signature");
                cs.endText();

                // Signature image
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(document, signatureBytes, "signature");
                float imgWidth = pdImage.getWidth();
                float imgHeight = pdImage.getHeight();

                float maxDrawWidth = 220;
                float maxDrawHeight = 90;

                float scale = Math.min(maxDrawWidth / imgWidth, maxDrawHeight / imgHeight);
                float drawWidth = imgWidth * scale;
                float drawHeight = imgHeight * scale;

                float imgX = marginX;
                float imgY = signatureBoxTopY - drawHeight - 10;
                if (imgY < signatureBoxBottomY) {
                    imgY = signatureBoxBottomY;
                }

                cs.drawImage(pdImage, imgX, imgY, drawWidth, drawHeight);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private float drawText(PDPageContentStream cs, org.apache.pdfbox.pdmodel.font.PDFont font, float fontSize, float x, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(x, y);
        cs.showText(text == null ? "" : text);
        cs.endText();
        return y - 1;
    }

    private float drawField(
            PDPageContentStream cs,
            PDType1Font labelFont,
            PDType1Font valueFont,
            float labelFontSize,
            float valueFontSize,
            float marginX,
            float y,
            float maxTextWidth,
            String label,
            String value,
            float lineHeight
    ) throws IOException {
        float labelWidth = Math.min(170, maxTextWidth * 0.35f);
        float currentXValue = marginX + labelWidth;

        // label
        cs.beginText();
        cs.setFont(labelFont, labelFontSize);
        cs.newLineAtOffset(marginX, y);
        cs.showText(label + ":");
        cs.endText();

        // value (wrap if needed)
        List<String> lines = wrapText(value == null ? "" : value, valueFont, valueFontSize, maxTextWidth - labelWidth);
        float currentY = y;
        for (int i = 0; i < lines.size(); i++) {
            if (i > 4) break; // keep PDF layout stable for long values
            cs.beginText();
            cs.setFont(valueFont, valueFontSize);
            cs.newLineAtOffset(currentXValue, currentY);
            cs.showText(lines.get(i));
            cs.endText();
            currentY -= lineHeight;
        }

        return currentY;
    }

    private List<String> wrapText(String text, org.apache.pdfbox.pdmodel.font.PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text == null) {
            return lines;
        }

        String[] words = text.replace("\r", "").replace("\n", " ").split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            if (line.length() == 0) {
                line.append(word);
                continue;
            }

            String candidate = line + " " + word;
            float candidateWidth = (font.getStringWidth(candidate) / 1000f) * fontSize;
            if (candidateWidth <= maxWidth) {
                line.append(" ").append(word);
            } else {
                lines.add(line.toString());
                line = new StringBuilder(word);
            }
        }

        if (line.length() > 0) {
            lines.add(line.toString());
        }
        return lines;
    }
}

