import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface InvitationEmailProps {
  inviterName: string;
  role: string;
  signupUrl: string;
  farmName: string;
}

export const InvitationEmail = ({
  inviterName,
  role,
  signupUrl,
  farmName,
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You're invited to join {farmName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={farmTitle}>🐄 {farmName}</Text>
        </Section>
        
        <Heading style={h1}>You're Invited!</Heading>
        
        <Text style={text}>
          <strong>{inviterName}</strong> has invited you to join their dairy farm management system 
          as a <strong>{role}</strong>.
        </Text>
        
        <Text style={text}>
          This system helps manage:
        </Text>
        
        <Section style={features}>
          <Text style={featureItem}>• Cattle management and tracking</Text>
          <Text style={featureItem}>• Milk production monitoring</Text>
          <Text style={featureItem}>• Feed management</Text>
          <Text style={featureItem}>• Health and vaccination records</Text>
          <Text style={featureItem}>• Analytics and reporting</Text>
        </Section>
        
        <Section style={ctaSection}>
          <Link
            href={signupUrl}
            target="_blank"
            style={button}
          >
            Accept Invitation & Create Account
          </Link>
        </Section>
        
        <Text style={smallText}>
          This invitation will expire in 7 days. If you didn't expect this invitation, 
          you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The {farmName} Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InvitationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#16a34a',
  textAlign: 'center' as const,
};

const farmTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 24px 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  margin: '16px 24px',
  lineHeight: '1.5',
};

const features = {
  margin: '24px',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
};

const featureItem = {
  color: '#333',
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '1.4',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 24px',
};

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 24px',
};

const smallText = {
  color: '#666',
  fontSize: '12px',
  margin: '16px 24px',
  lineHeight: '1.4',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  margin: '32px 24px 0',
  lineHeight: '1.4',
};