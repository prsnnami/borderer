# Generated by Django 3.2 on 2021-08-01 07:43

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('video', '0003_alter_project_layers'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False),
        ),
    ]
