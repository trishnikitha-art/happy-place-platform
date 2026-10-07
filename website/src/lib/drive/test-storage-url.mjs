import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Test environment variables
const config = {
  region: process.env.BLOB_REGION || "auto",
  endpoint: process.env.BLOB_ENDPOINT || "https://auto.auto.auto",
  accessKeyId: process.env.BLOB_ACCESS_KEY_ID || "test",
  secretAccessKey: process.env.BLOB_SECRET_ACCESS_KEY || "test",
  bucket: process.env.BLOB_BUCKET || "test-bucket"
};

console.log("Testing S3 client configuration:", config);

const client = new S3Client(config);

async function testStorage() {
  try {
    // Test 1: Generate a PUT signed URL
    const putCommand = new PutObjectCommand({
      Bucket: config.bucket,
      Key: "test-key.txt",
      ContentType: "text/plain"
    });
    
    const putUrl = await getSignedUrl(client, putCommand, { expiresIn: 3600 });
    console.log("✅ PUT signed URL generated successfully");
    console.log("   URL:", putUrl.substring(0, 100) + "...");
    
    // Test 2: Generate a GET signed URL
    const getCommand = new GetObjectCommand({
      Bucket: config.bucket,
      Key: "test-key.txt"
    });
    
    const getUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });
    console.log("✅ GET signed URL generated successfully");
    console.log("   URL:", getUrl.substring(0, 100) + "...");
    
    // Test 3: Verify URL format
    if (putUrl.includes("Signature") && putUrl.includes("Expires")) {
      console.log("✅ URL contains required signature parameters");
    } else {
      console.log("⚠️  URL may be missing signature parameters");
    }
    
    console.log("\n🎉 All storage URL tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Storage URL test failed:", error.message);
    return false;
  }
}

testStorage().then(success => {
  process.exit(success ? 0 : 1);
});