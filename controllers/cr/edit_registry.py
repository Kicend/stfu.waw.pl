from flask import request
from ext import models
from ext.auth import db

def edit_registry_controller(registry_id: int):
    def split_array(array, n):
        result = []
        length = len(array)
        index = 0
        cycle = 0
        while cycle < length / n:
            result.append(array[index:index + n])
            index += n
            cycle += 1

        return result

    values = []
    i = 0
    for data in request.form:
        if data != "_method":
            if i % 5 == 0 and request.form["_method"] != "post":
                values.append(data.split("_")[0])
                values.append(registry_id)
            try:
                number = int(request.form[data])
                if 0 <= number <= 999:
                    values.append(number)
                else:
                    if number < 0:
                        values.append(0)
                    else:
                        values.append(999)
            except ValueError:
                if i % 5 == 0:
                    name = request.form[data]
                    if len(name) <= 20:
                        values.append(name)
                    else:
                        values.append(name[:20])
                else:
                    values.append(0)
            i += 1

    if request.method == "POST" and request.form["_method"] == "post":
        form_data = split_array(list(values), 5)
        for dataset in form_data:
            record = models.RegistryLeaderBoardRecordModel(registry_id, dataset[0], dataset[1], dataset[2],
                                                           dataset[3], dataset[4])
            db.session.add(record)
            db.session.commit()
    elif request.method == "POST" and request.form["_method"] == "put":
        form_data = split_array(list(values), 7)
        updated_values = {}
        for dataset in form_data:
            try:
                record = models.RegistryLeaderBoardRecordModel.query.filter_by(record_id=dataset[0]).first()
                for i, column in enumerate(record.__table__.columns.keys()):
                    updated_values[column] = dataset[i]

                models.RegistryLeaderBoardRecordModel.query.filter_by(record_id=dataset[0]).update(updated_values)
                db.session.commit()
            except AttributeError:
                record = models.RegistryLeaderBoardRecordModel(dataset[1], dataset[2], dataset[3], dataset[4],
                                                               dataset[5], dataset[6])
                db.session.add(record)
                db.session.commit()
    elif request.method == "POST" and request.form["_method"] == "delete":
        for element in request.form:
            if element != "_method":
                models.RegistryLeaderBoardRecordModel.query.filter_by(record_id=element).delete()
        db.session.commit()