"""
Django management command to validate WhatsApp configuration.
Run this on production deployment to ensure proper setup.

Usage:
    python manage.py check_whatsapp
    python manage.py check_whatsapp --strict  # Fail on errors
"""

from django.core.management.base import BaseCommand, CommandError
from exam.services.whatsapp_notification import WhatsAppConfig
import sys


class Command(BaseCommand):
    help = 'Validate WhatsApp Business API configuration for production'

    def add_arguments(self, parser):
        parser.add_argument(
            '--strict',
            action='store_true',
            help='Exit with error code if validation fails (for CI/CD)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('WhatsApp Configuration Check'))
        self.stdout.write('')
        
        # Check if enabled
        if not WhatsAppConfig.ENABLED:
            self.stdout.write(self.style.WARNING('⚠️  WhatsApp is DISABLED'))
            self.stdout.write('   Set WHATSAPP_ENABLED=true to enable')
            return
        
        self.stdout.write(self.style.SUCCESS('✅ WhatsApp is ENABLED'))
        
        # Validate configuration
        is_valid, errors = WhatsAppConfig.validate_config()
        
        # Display configuration (safely)
        self.stdout.write('')
        self.stdout.write('Configuration:')
        self.stdout.write(f'  WHATSAPP_TOKEN: {WhatsAppConfig.get_masked_token()}')
        self.stdout.write(f'  WHATSAPP_PHONE_ID: {WhatsAppConfig.PHONE_ID if WhatsAppConfig.PHONE_ID else "Not Set"}')
        self.stdout.write(f'  WABA_ID: {WhatsAppConfig.WABA_ID if WhatsAppConfig.WABA_ID else "Not Set (optional)"}')
        self.stdout.write(f'  API_VERSION: {WhatsAppConfig.API_VERSION}')
        self.stdout.write(f'  API_BASE: {WhatsAppConfig.API_BASE}')
        
        self.stdout.write('')
        
        # Report validation results
        if is_valid:
            self.stdout.write(self.style.SUCCESS('✅ Configuration is VALID'))
            self.stdout.write('')
            self.stdout.write('Ready to send WhatsApp notifications!')
        else:
            self.stdout.write(self.style.ERROR('❌ Configuration is INVALID'))
            self.stdout.write('')
            self.stdout.write('Errors found:')
            for error in errors:
                self.stdout.write(self.style.ERROR(f'  • {error}'))
            
            self.stdout.write('')
            self.stdout.write('Please fix the errors in your .env file')
            
            if options['strict']:
                raise CommandError('WhatsApp configuration validation failed')
            else:
                self.stdout.write('')
                self.stdout.write(self.style.WARNING('Run with --strict flag to fail on errors'))
                sys.exit(1)
