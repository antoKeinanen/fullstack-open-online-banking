ansible-galaxy install -r requirements.yaml

ansible-playbook k3s.orchestration.site -i inventory.yaml --ask-pass --ask-become-pass