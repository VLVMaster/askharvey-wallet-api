const { PKPass } = require("passkit-generator");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getBufferFromEnvBase64(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return Buffer.from(value, "base64");
}

module.exports = async (req, res) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: "petId is required" });

    const { data: pet, error } = await supabase
      .from("pets")
      .select("*")
      .eq("id", petId)
      .single();

    if (error || !pet) return res.status(404).json({ error: "Pet not found" });

    const certificates = {
      wwdr: getBufferFromEnvBase64("PASS_WWDR_CERT_B64"),
      signerCert: getBufferFromEnvBase64("PASS_SIGNER_CERT_B64"),
      signerKey: getBufferFromEnvBase64("PASS_SIGNER_KEY_B64"),
      signerKeyPassphrase: process.env.PASS_SIGNER_KEY_PASSPHRASE,
    };

    const id = `AH-${pet.id}`;

    const pass = await PKPass.from(
      {
        model: "./AskHarveyGeneric.pass",
        certificates,
      },
      {
        serialNumber: id,
        barcode: { message: id, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" },
        generic: {
          headerFields: [{ key: "idNumber", label: "ID #", value: id }],
          primaryFields: [{ key: "petName", label: "Name", value: pet.name }],
          secondaryFields: [{ key: "breed", label: "Breed", value: pet.breed }],
          auxiliaryFields: [{ key: "microchip", label: "Microchip", value: pet.microchip }],
          backFields: [
            { key: "vetPhone", label: "Vet Phone", value: pet.vet_phone },
            { key: "insurance", label: "Insurance", value: pet.insurance },
            { key: "ownerContact", label: "Owner Contact", value: pet.owner_contact }
          ]
        }
      }
    );

    const buffer = pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="${id}.pkpass"`);
    res.status(200).send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
};
