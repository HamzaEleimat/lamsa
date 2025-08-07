#!/bin/bash

# Certificate Extraction Script for BeautyCort
# This script extracts SSL certificates and generates hashes for certificate pinning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAINS=("api.welamsa.com" "welamsa.com")
OUTPUT_DIR="./certificates"
ANDROID_CERT_DIR="../android/app/src/main/assets/certs"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}WeLamsa Certificate Extraction Tool${NC}"
echo "======================================"
echo ""

# Function to extract certificate and generate hash
extract_certificate() {
    local domain=$1
    echo -e "${YELLOW}Processing domain: $domain${NC}"
    
    # Extract certificate
    echo "- Extracting certificate..."
    openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | \
        openssl x509 -outform DER > "$OUTPUT_DIR/$domain.der"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Certificate extracted successfully${NC}"
        
        # Generate SHA-256 hash
        echo "- Generating SHA-256 hash..."
        local hash=$(cat "$OUTPUT_DIR/$domain.der" | openssl dgst -sha256 -binary | openssl enc -base64)
        echo -e "${GREEN}✓ Hash: sha256/$hash${NC}"
        
        # Save hash to file
        echo "sha256/$hash" > "$OUTPUT_DIR/$domain.hash"
        
        # Get certificate details
        echo "- Certificate details:"
        openssl x509 -inform DER -in "$OUTPUT_DIR/$domain.der" -noout -subject -issuer -dates | sed 's/^/  /'
        
    else
        echo -e "${RED}✗ Failed to extract certificate for $domain${NC}"
        return 1
    fi
    
    echo ""
}

# Function to extract full certificate chain
extract_chain() {
    local domain=$1
    echo -e "${YELLOW}Extracting certificate chain for: $domain${NC}"
    
    # Get full certificate chain
    openssl s_client -connect "$domain:443" -servername "$domain" -showcerts < /dev/null 2>/dev/null > "$OUTPUT_DIR/$domain.chain.pem"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Certificate chain extracted${NC}"
        
        # Count certificates in chain
        local cert_count=$(grep -c "BEGIN CERTIFICATE" "$OUTPUT_DIR/$domain.chain.pem")
        echo "  Found $cert_count certificates in chain"
        
        # Extract each certificate from chain
        awk -v dir="$OUTPUT_DIR" -v domain="$domain" '
        /-----BEGIN CERTIFICATE-----/ {
            cert_num++
            cert=""
        }
        /-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/ {
            cert=cert $0 "\n"
        }
        /-----END CERTIFICATE-----/ {
            filename=sprintf("%s/%s.chain.%d.pem", dir, domain, cert_num)
            print cert > filename
            close(filename)
        }
        ' "$OUTPUT_DIR/$domain.chain.pem"
        
        # Generate hashes for each certificate in chain
        for i in $(seq 1 $cert_count); do
            if [ -f "$OUTPUT_DIR/$domain.chain.$i.pem" ]; then
                # Convert to DER and generate hash
                openssl x509 -inform PEM -in "$OUTPUT_DIR/$domain.chain.$i.pem" -outform DER > "$OUTPUT_DIR/$domain.chain.$i.der"
                local hash=$(cat "$OUTPUT_DIR/$domain.chain.$i.der" | openssl dgst -sha256 -binary | openssl enc -base64)
                echo "  Certificate $i hash: sha256/$hash"
            fi
        done
    else
        echo -e "${RED}✗ Failed to extract certificate chain for $domain${NC}"
    fi
    
    echo ""
}

# Main execution
echo "Starting certificate extraction..."
echo ""

# Extract certificates for each domain
for domain in "${DOMAINS[@]}"; do
    extract_certificate "$domain"
    extract_chain "$domain"
done

# Generate configuration file
echo -e "${YELLOW}Generating configuration...${NC}"
cat > "$OUTPUT_DIR/certificate-config.ts" << EOF
/**
 * Certificate configuration for BeautyCort
 * Generated on: $(date)
 * 
 * IMPORTANT: Review and update these hashes in your application
 */

export const CERTIFICATE_HASHES = {
  production: [
EOF

# Add hashes to configuration
for domain in "${DOMAINS[@]}"; do
    if [ -f "$OUTPUT_DIR/$domain.hash" ]; then
        hash=$(cat "$OUTPUT_DIR/$domain.hash")
        echo "    '$hash', // $domain" >> "$OUTPUT_DIR/certificate-config.ts"
    fi
done

cat >> "$OUTPUT_DIR/certificate-config.ts" << EOF
  ],
  staging: [
    // Add staging certificate hashes here
  ],
};

export const PINNED_DOMAINS = [
EOF

# Add domains to configuration
for domain in "${DOMAINS[@]}"; do
    echo "  '$domain'," >> "$OUTPUT_DIR/certificate-config.ts"
done

echo "];" >> "$OUTPUT_DIR/certificate-config.ts"

echo -e "${GREEN}✓ Configuration generated${NC}"

# Copy certificates to Android directory if it exists
if [ -d "$ANDROID_CERT_DIR" ]; then
    echo ""
    echo -e "${YELLOW}Copying certificates to Android project...${NC}"
    mkdir -p "$ANDROID_CERT_DIR"
    cp "$OUTPUT_DIR"/*.der "$ANDROID_CERT_DIR/"
    echo -e "${GREEN}✓ Certificates copied to Android project${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}Certificate extraction complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the generated certificate hashes in: $OUTPUT_DIR/certificate-config.ts"
echo "2. Update your app's certificate configuration"
echo "3. For iOS: Add the .der files to your Xcode project"
echo "4. For Android: Certificates have been copied to $ANDROID_CERT_DIR"
echo "5. Test certificate pinning thoroughly before release"
echo ""
echo "Certificate files are located in: $OUTPUT_DIR"

# Cleanup PEM files (keep DER files)
rm -f "$OUTPUT_DIR"/*.pem

exit 0