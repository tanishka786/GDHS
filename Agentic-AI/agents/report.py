"""Report Agent for generating clinician PDF reports."""

import asyncio
import time
import io
import os
from typing import Dict, List, Optional, Any, Tuple
from loguru import logger

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import black, blue, red, green
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
    from reportlab.platypus.flowables import PageBreak
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab not available, using mock implementation")

from services.storage import storage_service


class ReportAgent:
    """Agent for generating clinician PDF reports."""
    
    def __init__(self):
        """Initialize report agent."""
        self.agent_name = "report"
        self.version = "1.0.0"
        self.page_width, self.page_height = A4 if REPORTLAB_AVAILABLE else (595, 842)
        logger.info(f"ReportAgent {self.version} initialized")
    
    async def generate_clinician_report(
        self,
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        images: Dict[str, str],
        patient_summary: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate clinician PDF report.
        
        Args:
            triage_result: Triage assessment result
            detections: List of detection results from YOLO models
            images: Dict with original and annotated image file IDs
            patient_summary: Optional patient summary from diagnosis agent
            metadata: Optional metadata (timestamps, versions, etc.)
            
        Returns:
            Dict containing PDF file ID, JSON manifest ID, and metadata
        """
        start_time = time.time()
        import uuid
        request_id = f"rpt_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        logger.info(f"[{request_id}] Starting clinician report generation")
        
        try:
            # Validate inputs
            if not isinstance(triage_result, dict):
                raise ValueError("Invalid triage_result format")
            
            if not isinstance(detections, list):
                raise ValueError("Invalid detections format")
            
            if not isinstance(images, dict):
                raise ValueError("Invalid images format")
            
            # Generate report content
            report_data = self._prepare_report_data(
                triage_result, detections, images, patient_summary, metadata, request_id
            )
            
            # Generate PDF
            pdf_content = await self._generate_pdf(report_data)
            
            # Generate JSON manifest
            json_manifest = self._generate_json_manifest(report_data)
            
            # Store files
            pdf_id = await storage_service.store_file(
                content=pdf_content,
                filename=f"report_{request_id}.pdf",
                content_type="application/pdf",
                bucket="reports"
            )
            
            json_id = await storage_service.store_file(
                content=json_manifest.encode('utf-8'),
                filename=f"manifest_{request_id}.json",
                content_type="application/json",
                bucket="manifests"
            )
            
            result = {
                "pdf_id": pdf_id,
                "json_id": json_id,
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time(),
                "report_metadata": {
                    "triage_level": triage_result.get("level", "UNKNOWN"),
                    "detection_count": len(detections),
                    "has_images": bool(images),
                    "page_count": report_data.get("page_count", 1)
                }
            }
            
            logger.info(f"[{request_id}] Report generation completed in {result['processing_time_ms']}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"[{request_id}] Report generation failed: {e}")
            
            # Return error result
            return {
                "pdf_id": None,
                "json_id": None,
                "agent": self.agent_name,
                "version": self.version,
                "request_id": request_id,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": time.time(),
                "error": str(e),
                "report_metadata": {
                    "triage_level": triage_result.get("level", "UNKNOWN") if isinstance(triage_result, dict) else "UNKNOWN",
                    "detection_count": len(detections) if isinstance(detections, list) else 0,
                    "has_images": bool(images) if isinstance(images, dict) else False,
                    "page_count": 0
                }
            }
    
    def _prepare_report_data(
        self,
        triage_result: Dict[str, Any],
        detections: List[Dict[str, Any]],
        images: Dict[str, str],
        patient_summary: Optional[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]],
        request_id: str
    ) -> Dict[str, Any]:
        """Prepare structured data for report generation."""
        
        # Generate report timestamp
        from datetime import datetime
        report_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Prepare findings section
        findings = self._prepare_findings_section(detections)
        
        # Prepare impressions section
        impressions = self._prepare_impressions_section(triage_result, detections)
        
        # Prepare recommendations section
        recommendations = self._prepare_recommendations_section(triage_result, detections)
        
        # Prepare technical details
        technical_details = self._prepare_technical_details(detections, metadata)
        
        return {
            "request_id": request_id,
            "timestamp": report_timestamp,
            "triage_result": triage_result,
            "detections": detections,
            "images": images,
            "patient_summary": patient_summary,
            "metadata": metadata or {},
            "sections": {
                "findings": findings,
                "impressions": impressions,
                "recommendations": recommendations,
                "technical_details": technical_details
            },
            "page_count": 1  # Will be updated during PDF generation
        }
    
    def _prepare_findings_section(self, detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare findings section content."""
        
        if not detections:
            return {
                "summary": "No significant abnormalities detected in the analyzed X-ray image.",
                "details": [],
                "detection_count": 0
            }
        
        # Group detections by type
        detection_groups = {}
        for detection in detections:
            label = detection.get("label", "unknown")
            if label not in detection_groups:
                detection_groups[label] = []
            detection_groups[label].append(detection)
        
        # Generate findings details
        details = []
        for label, group in detection_groups.items():
            if len(group) == 1:
                detection = group[0]
                score = detection.get("score", 0.0)
                details.append({
                    "finding": f"{label.replace('_', ' ').title()}",
                    "confidence": f"{score:.2f}",
                    "description": f"Single {label.replace('_', ' ')} detected with {score:.1%} confidence"
                })
            else:
                avg_score = sum(d.get("score", 0.0) for d in group) / len(group)
                details.append({
                    "finding": f"Multiple {label.replace('_', ' ').title()}s",
                    "confidence": f"{avg_score:.2f}",
                    "description": f"{len(group)} instances of {label.replace('_', ' ')} detected (avg confidence: {avg_score:.1%})"
                })
        
        # Generate summary
        if len(detections) == 1:
            primary_finding = detections[0].get("label", "finding").replace("_", " ")
            summary = f"Single {primary_finding} identified in the X-ray image."
        else:
            summary = f"Multiple findings identified: {len(detections)} total detections across {len(detection_groups)} categories."
        
        return {
            "summary": summary,
            "details": details,
            "detection_count": len(detections)
        }
    
    def _prepare_impressions_section(
        self, 
        triage_result: Dict[str, Any], 
        detections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare impressions section content."""
        
        triage_level = triage_result.get("level", "UNKNOWN")
        confidence = triage_result.get("confidence", 0.0)
        rationale = triage_result.get("rationale", [])
        
        # Generate clinical impression based on triage level
        if triage_level == "RED":
            urgency = "Urgent findings requiring immediate medical attention"
            clinical_significance = "High"
        elif triage_level == "AMBER":
            urgency = "Findings requiring medical evaluation within hours"
            clinical_significance = "Moderate"
        elif triage_level == "GREEN":
            urgency = "Findings suitable for routine medical follow-up"
            clinical_significance = "Low to Moderate"
        else:
            urgency = "Assessment inconclusive, recommend clinical correlation"
            clinical_significance = "Indeterminate"
        
        # Generate detailed impression
        if not detections:
            impression = "No significant radiographic abnormalities detected. Clinical correlation recommended if symptoms persist."
        else:
            primary_findings = [d.get("label", "finding").replace("_", " ") for d in detections[:3]]
            if len(detections) > 3:
                impression = f"Radiographic findings consistent with {', '.join(primary_findings)} and {len(detections) - 3} additional findings. {urgency.lower()}."
            else:
                impression = f"Radiographic findings consistent with {', '.join(primary_findings)}. {urgency.lower()}."
        
        return {
            "triage_level": triage_level,
            "urgency": urgency,
            "clinical_significance": clinical_significance,
            "confidence": f"{confidence:.1%}",
            "impression": impression,
            "rationale": rationale
        }
    
    def _prepare_recommendations_section(
        self, 
        triage_result: Dict[str, Any], 
        detections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare recommendations section content."""
        
        triage_level = triage_result.get("level", "UNKNOWN")
        
        # Base recommendations by triage level
        if triage_level == "RED":
            immediate_actions = [
                "Immediate orthopedic consultation recommended",
                "Consider emergency department evaluation if not already in acute care setting",
                "Immobilization of affected area pending specialist evaluation"
            ]
            follow_up = [
                "Urgent orthopedic follow-up within 24 hours",
                "Serial imaging may be required to monitor progression"
            ]
            additional_imaging = [
                "Consider CT scan for detailed bone assessment if indicated",
                "MRI may be warranted for soft tissue evaluation"
            ]
        elif triage_level == "AMBER":
            immediate_actions = [
                "Orthopedic consultation within 24-48 hours",
                "Symptomatic treatment with appropriate analgesia",
                "Activity modification as clinically indicated"
            ]
            follow_up = [
                "Orthopedic follow-up within 1-2 weeks",
                "Repeat imaging in 2-4 weeks if symptoms persist"
            ]
            additional_imaging = [
                "Additional views may be helpful for complete assessment",
                "Consider stress views if clinically indicated"
            ]
        elif triage_level == "GREEN":
            immediate_actions = [
                "Routine orthopedic consultation as clinically indicated",
                "Conservative management with rest and activity modification",
                "Over-the-counter analgesia as needed"
            ]
            follow_up = [
                "Routine follow-up in 2-4 weeks",
                "Return if symptoms worsen or fail to improve"
            ]
            additional_imaging = [
                "Repeat imaging only if clinically indicated",
                "Consider alternative imaging modalities if symptoms persist"
            ]
        else:
            immediate_actions = [
                "Clinical correlation recommended",
                "Consider repeat imaging with improved technique"
            ]
            follow_up = [
                "Follow-up as clinically appropriate"
            ]
            additional_imaging = [
                "Additional imaging may be warranted based on clinical assessment"
            ]
        
        # Add detection-specific recommendations
        detection_specific = []
        if detections:
            fracture_count = sum(1 for d in detections if "fracture" in d.get("label", "").lower())
            if fracture_count > 0:
                detection_specific.append(f"Fracture management protocol appropriate for {fracture_count} detected fracture(s)")
            
            displacement_count = sum(1 for d in detections if "displacement" in d.get("label", "").lower())
            if displacement_count > 0:
                detection_specific.append("Assess for reduction requirements given detected displacement")
        
        return {
            "immediate_actions": immediate_actions,
            "follow_up": follow_up,
            "additional_imaging": additional_imaging,
            "detection_specific": detection_specific,
            "triage_level": triage_level
        }
    
    def _prepare_technical_details(
        self, 
        detections: List[Dict[str, Any]], 
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare technical details section."""
        
        # Detection statistics
        detection_stats = {
            "total_detections": len(detections),
            "confidence_range": "N/A",
            "average_confidence": "N/A"
        }
        
        if detections:
            scores = [d.get("score", 0.0) for d in detections]
            min_score = min(scores)
            max_score = max(scores)
            avg_score = sum(scores) / len(scores)
            
            detection_stats.update({
                "confidence_range": f"{min_score:.2f} - {max_score:.2f}",
                "average_confidence": f"{avg_score:.2f}"
            })
        
        # System information
        system_info = {
            "analysis_system": "Orthopedic Assistant MCP Server",
            "version": self.version,
            "analysis_timestamp": metadata.get("timestamp") if metadata else time.time(),
            "processing_time": metadata.get("processing_time_ms", "N/A") if metadata else "N/A"
        }
        
        # Model information
        model_info = {
            "detection_model": "Fine-tuned YOLO",
            "triage_model": "LLM-based assessment",
            "confidence_threshold": "0.35 (configurable)"
        }
        
        return {
            "detection_stats": detection_stats,
            "system_info": system_info,
            "model_info": model_info
        }
    
    async def _generate_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """Generate PDF content from report data."""
        
        if not REPORTLAB_AVAILABLE:
            return self._generate_mock_pdf(report_data)
        
        # Create PDF buffer
        buffer = io.BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build content
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue
        )
        
        # Title
        story.append(Paragraph("Orthopedic X-Ray Analysis Report", title_style))
        story.append(Spacer(1, 20))
        
        # Report metadata
        metadata_data = [
            ["Report ID:", report_data["request_id"]],
            ["Generated:", report_data["timestamp"]],
            ["Triage Level:", report_data["triage_result"].get("level", "UNKNOWN")],
            ["Detection Count:", str(len(report_data["detections"]))]
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 3*inch])
        metadata_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        # Findings section
        story.append(Paragraph("FINDINGS", section_style))
        findings = report_data["sections"]["findings"]
        story.append(Paragraph(findings["summary"], styles['Normal']))
        
        if findings["details"]:
            story.append(Spacer(1, 10))
            findings_data = [["Finding", "Confidence", "Description"]]
            for detail in findings["details"]:
                findings_data.append([
                    detail["finding"],
                    detail["confidence"],
                    detail["description"]
                ])
            
            findings_table = Table(findings_data, colWidths=[1.5*inch, 1*inch, 3*inch])
            findings_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(findings_table)
        
        story.append(Spacer(1, 20))
        
        # Impressions section
        story.append(Paragraph("IMPRESSIONS", section_style))
        impressions = report_data["sections"]["impressions"]
        
        impression_data = [
            ["Triage Level:", impressions["triage_level"]],
            ["Clinical Significance:", impressions["clinical_significance"]],
            ["Assessment Confidence:", impressions["confidence"]]
        ]
        
        impression_table = Table(impression_data, colWidths=[2*inch, 3*inch])
        impression_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(impression_table)
        story.append(Spacer(1, 10))
        story.append(Paragraph(impressions["impression"], styles['Normal']))
        
        if impressions["rationale"]:
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>Clinical Rationale:</b>", styles['Normal']))
            for rationale in impressions["rationale"]:
                story.append(Paragraph(f"• {rationale}", styles['Normal']))
        
        story.append(Spacer(1, 20))
        
        # Recommendations section
        story.append(Paragraph("RECOMMENDATIONS", section_style))
        recommendations = report_data["sections"]["recommendations"]
        
        story.append(Paragraph("<b>Immediate Actions:</b>", styles['Normal']))
        for action in recommendations["immediate_actions"]:
            story.append(Paragraph(f"• {action}", styles['Normal']))
        
        story.append(Spacer(1, 10))
        story.append(Paragraph("<b>Follow-up Care:</b>", styles['Normal']))
        for followup in recommendations["follow_up"]:
            story.append(Paragraph(f"• {followup}", styles['Normal']))
        
        if recommendations["additional_imaging"]:
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>Additional Imaging:</b>", styles['Normal']))
            for imaging in recommendations["additional_imaging"]:
                story.append(Paragraph(f"• {imaging}", styles['Normal']))
        
        if recommendations["detection_specific"]:
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>Detection-Specific Recommendations:</b>", styles['Normal']))
            for specific in recommendations["detection_specific"]:
                story.append(Paragraph(f"• {specific}", styles['Normal']))
        
        # Add page break before technical details
        story.append(PageBreak())
        
        # Technical details section
        story.append(Paragraph("TECHNICAL DETAILS", section_style))
        technical = report_data["sections"]["technical_details"]
        
        tech_data = [
            ["Total Detections:", str(technical["detection_stats"]["total_detections"])],
            ["Confidence Range:", technical["detection_stats"]["confidence_range"]],
            ["Average Confidence:", technical["detection_stats"]["average_confidence"]],
            ["Analysis System:", technical["system_info"]["analysis_system"]],
            ["System Version:", technical["system_info"]["version"]]
        ]
        
        tech_table = Table(tech_data, colWidths=[2*inch, 3*inch])
        tech_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(tech_table)
        
        # Medical disclaimer
        story.append(Spacer(1, 30))
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_JUSTIFY
        )
        
        disclaimer_text = """
        MEDICAL DISCLAIMER: This automated analysis is provided for informational purposes only and does not constitute 
        medical advice, diagnosis, or treatment. The results should not be used as a substitute for professional medical 
        consultation, examination, or treatment. Always seek the advice of qualified healthcare professionals for any 
        medical concerns. The accuracy of automated analysis may vary and should always be confirmed by qualified 
        medical professionals.
        """
        
        story.append(Paragraph(disclaimer_text, disclaimer_style))
        
        # Build PDF
        doc.build(story)
        
        # Update page count
        report_data["page_count"] = 2  # We know we have 2 pages
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def _generate_mock_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """Generate mock PDF when ReportLab is not available."""
        
        # Create a simple text-based "PDF" for testing
        content = f"""
ORTHOPEDIC X-RAY ANALYSIS REPORT

Report ID: {report_data['request_id']}
Generated: {report_data['timestamp']}
Triage Level: {report_data['triage_result'].get('level', 'UNKNOWN')}

FINDINGS:
{report_data['sections']['findings']['summary']}

IMPRESSIONS:
{report_data['sections']['impressions']['impression']}

RECOMMENDATIONS:
Immediate Actions:
{chr(10).join('• ' + action for action in report_data['sections']['recommendations']['immediate_actions'])}

Follow-up Care:
{chr(10).join('• ' + followup for followup in report_data['sections']['recommendations']['follow_up'])}

TECHNICAL DETAILS:
Total Detections: {report_data['sections']['technical_details']['detection_stats']['total_detections']}
System: {report_data['sections']['technical_details']['system_info']['analysis_system']}

MEDICAL DISCLAIMER:
This automated analysis is provided for informational purposes only and does not constitute medical advice.
"""
        
        return content.encode('utf-8')
    
    def _generate_json_manifest(self, report_data: Dict[str, Any]) -> str:
        """Generate JSON manifest for the report."""
        
        import json
        
        manifest = {
            "report_id": report_data["request_id"],
            "timestamp": report_data["timestamp"],
            "version": self.version,
            "agent": self.agent_name,
            "content": {
                "triage_result": report_data["triage_result"],
                "detections": report_data["detections"],
                "images": report_data["images"],
                "sections": report_data["sections"]
            },
            "metadata": {
                "page_count": report_data.get("page_count", 1),
                "generation_timestamp": time.time(),
                "format": "PDF",
                "size_category": "standard"
            }
        }
        
        return json.dumps(manifest, indent=2, default=str)


# Global report agent instance
report_agent = ReportAgent()