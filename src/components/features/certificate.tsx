"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { SimulationResultData } from "@/types";

interface CertificateProps {
  result: SimulationResultData & { userId?: string };
}

// Hex color constants
const COLORS = {
  primary: "#5D3FD3",
  primaryLight: "#7C6AE5",
  primaryDark: "#4a32a8",
  green: "#1DAF6A",
  greenLight: "#3DD68C",
  orange: "#D97706",
  orangeLight: "#F59E0B",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  dark: "#1a1a2e",
  white: "#ffffff",
};

export function Certificate({ result }: CertificateProps) {
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (response.ok) {
          const { data } = await response.json();

          // Check various possible structures
          const user = data.user || data;

          if (user?.name) {
            setUserName(user.name);
          } else if (user?.email) {
            setUserName(user.email.split("@")[0]);
          } else if (user?.displayName) {
            setUserName(user.displayName);
          } else {
            setUserNotFound(true);
          }
        } else {
          setUserNotFound(true);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUserNotFound(true);
      } finally {
        setIsLoadingUser(false);
      }
    };

    void fetchUserProfile();
  }, []);

  const toeflSummary = result.scoreSummary?.toefl;
  const heroValue =
    result.examType === "toefl"
      ? String(toeflSummary?.overall ?? result.totalPercentage)
      : (result.scoreSummary?.ielts?.overallBand ?? 0).toFixed(1);

  const examDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getPerformanceLevel = () => {
    if (result.totalPercentage >= 70) return "Excellent";
    if (result.totalPercentage >= 50) return "Good";
    return "Satisfactory";
  };

  const handleOpenModal = () => {
    if (userNotFound || !userName) {
      alert("Please log in to download your certificate.");
      return;
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Flow: Component → Image (Canvas) → PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!certificateRef.current) {
      alert("Certificate element not found");
      return;
    }

    if (userNotFound || !userName) {
      alert("Please log in to download your certificate.");
      return;
    }

    if (isOwner === false) {
      alert("You can only download certificates for tests you have taken.");
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Convert React Component to Canvas (Image)
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Step 2: Convert Canvas to Image Data
      const imageData = canvas.toDataURL("image/png", 1.0);

      // Step 3: Create PDF and attach image
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;

      // Attach image to PDF
      pdf.addImage(
        imageData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio,
        undefined,
        "FAST",
      );

      // Generate filename
      const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Wikin_${result.examType.toUpperCase()}_Certificate_${sanitizedName}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Save PDF
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [result, userName, userNotFound, isOwner]);

  // Certificate styles
  const containerStyles: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: "16px",
    padding: "48px",
    width: "800px",
    minHeight: "560px",
    margin: "0 auto",
    background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
    border: "1px solid #e8eaf6",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  };

  // If user not found, show disabled button with debug option
  if (userNotFound) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            padding: "16px",
            backgroundColor: "#FEF3C7",
            borderRadius: "10px",
            border: "1px solid #FCD34D",
          }}
        >
          <p style={{ fontSize: "14px", color: "#92400E", margin: 0 }}>
            ⚠️ Please log in to download your certificate.
          </p>
          <p
            style={{ fontSize: "12px", color: "#92400E", margin: "8px 0 0 0" }}
          >
            Check console (F12) for debug info
          </p>
        </div>
        <button
          disabled
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "10px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: COLORS.gray400,
            backgroundColor: COLORS.gray100,
            border: "none",
            cursor: "not-allowed",
          }}
        >
          <svg
            style={{ height: "16px", width: "16px" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Login Required
        </button>
        {/* Debug button for development */}
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/auth/session", {
                credentials: "include",
              });
              const data = await res.json();
              alert("Check console for session data");
            } catch (e) {
              console.error("Debug error:", e);
            }
          }}
          style={{
            padding: "8px",
            fontSize: "12px",
            backgroundColor: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Debug: Check Session
        </button>
      </div>
    );
  }

  // If still loading user
  if (isLoadingUser) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          disabled
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "10px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: COLORS.gray400,
            backgroundColor: COLORS.gray100,
            border: "none",
            cursor: "wait",
          }}
        >
          <svg
            style={{
              height: "16px",
              width: "16px",
              animation: "spin 1s linear infinite",
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </button>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Main Button */}
      <button
        className="border border-[var(--color-primary)]"
        onClick={handleOpenModal}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          borderRadius: "10px",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: 600,
          color: COLORS.primary,
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
      >
        Download Certificate
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: COLORS.white,
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: `1px solid ${COLORS.gray200}`,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: COLORS.dark,
                    margin: 0,
                  }}
                >
                  Certificate Preview
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                  color: COLORS.gray500,
                }}
              >
                <svg
                  style={{ height: "24px", width: "24px" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Certificate Content */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px",
                overflow: "auto",
              }}
            >
              <div ref={certificateRef} style={containerStyles}>
                {/* Content */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 10,
                    display: "flex",
                    height: "100%",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  {/* Logo */}
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background: "url(/logo.png)",
                      backgroundSize: "cover",
                    }}
                  ></div>

                  {/* Title */}
                  <div style={{ marginBottom: "32px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        color: COLORS.gray500,
                        margin: "0 0 8px 0",
                      }}
                    >
                      Certificate of Completions
                    </p>
                    <h2
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: COLORS.primary,
                        margin: 0,
                      }}
                    >
                      {result.examType.toUpperCase()} Simulation
                    </h2>
                  </div>

                  {/* Recipient */}
                  <div style={{ marginBottom: "32px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        color: COLORS.gray500,
                        margin: "0 0 8px 0",
                      }}
                    >
                      This certifies that
                    </p>
                    <h3
                      style={{
                        fontSize: "52px",
                        fontWeight: 700,
                        color: COLORS.dark,
                        fontFamily: "'Pinyon Script', cursive",
                        margin: 0,
                      }}
                    >
                      {userName}
                    </h3>
                    <div
                      style={{
                        margin: "12px auto 0",
                        height: "2px",
                        width: "192px",
                        background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
                      }}
                    />
                  </div>

                  {/* Achievement */}
                  <div style={{ marginBottom: "32px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        color: COLORS.gray500,
                        margin: "0 0 12px 0",
                      }}
                    >
                      has successfully completed the{" "}
                      {result.examType.toUpperCase()} {result.difficulty} Level
                      Simulation with a score of
                    </p>
                  </div>

                  {/* Score Breakdown */}
                  <div
                    style={{
                      marginBottom: "32px",
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      maxWidth: "50%",
                    }}
                  >
                    {result.sectionScores.map((section) => (
                      <div
                        key={section.sectionId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          background: "#f8f9ff",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "12px",
                            color: COLORS.gray500,
                            margin: "0 0 4px 0",
                          }}
                        >
                          {section.sectionTitle}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: COLORS.primary,
                            margin: 0,
                          }}
                        >
                          {section.scaledScore}
                        </p>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        background: "#f8f9ff",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: COLORS.gray500,
                          margin: "0 0 4px 0",
                        }}
                      >
                        Total
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: COLORS.primary,
                          margin: 0,
                        }}
                      >
                        {heroValue}
                      </p>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      width: "100%",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      paddingTop: "32px",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: COLORS.gray400,
                          margin: "0 0 4px 0",
                        }}
                      >
                        Date of Completion
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: COLORS.dark,
                          margin: 0,
                        }}
                      >
                        {examDate}
                      </p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: COLORS.gray500,
                          margin: "0 0 2px 0",
                        }}
                      >
                        Wikin
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: COLORS.gray400,
                          margin: 0,
                        }}
                      >
                        Authorized Signature
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: COLORS.gray400,
                          margin: "0 0 4px 0",
                        }}
                      >
                        Certificate ID
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: COLORS.dark,
                          margin: 0,
                        }}
                      >
                        WK-{Date.now().toString(36).toUpperCase().slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                paddingTop: "16px",
                borderTop: `1px solid ${COLORS.gray200}`,
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.gray200}`,
                  backgroundColor: COLORS.white,
                  color: COLORS.gray600,
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isGenerating
                    ? COLORS.gray400
                    : COLORS.primary,
                  color: COLORS.white,
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isGenerating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isGenerating ? 0.5 : 1,
                }}
              >
                {isGenerating ? (
                  <>
                    <svg
                      style={{
                        height: "16px",
                        width: "16px",
                        animation: "spin 1s linear infinite",
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        style={{ opacity: 0.25 }}
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      style={{ height: "16px", width: "16px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
